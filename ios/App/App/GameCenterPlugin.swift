import Capacitor
import GameKit
import UIKit

@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenterPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadLeaderboard", returnType: CAPPluginReturnPromise)
    ]

    private var pendingAuthCalls: [CAPPluginCall] = []
    private var hasInstalledAuthHandler = false

    @objc func authenticate(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        if player.isAuthenticated {
            call.resolve(playerPayload(player))
            return
        }

        pendingAuthCalls.append(call)
        if hasInstalledAuthHandler {
            return
        }

        hasInstalledAuthHandler = true
        player.authenticateHandler = { [weak self] viewController, error in
            guard let self = self else { return }

            if let viewController = viewController {
                DispatchQueue.main.async {
                    self.bridge?.viewController?.present(viewController, animated: true)
                }
                return
            }

            let calls = self.pendingAuthCalls
            self.pendingAuthCalls.removeAll()
            self.hasInstalledAuthHandler = false

            if let error = error {
                calls.forEach { $0.reject(error.localizedDescription) }
                return
            }

            let payload = self.playerPayload(player)
            calls.forEach { $0.resolve(payload) }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("Game Center player is not authenticated")
            return
        }

        let score = call.getInt("score", 0)
        let context = call.getInt("context", 0)
        let leaderboardIDs =
            call.getArray("leaderboardIds", String.self) ??
            call.getArray("leaderboardIDs", String.self) ??
            call.getString("leaderboardId").map { [$0] } ??
            call.getString("leaderboardID").map { [$0] } ??
            []

        if leaderboardIDs.isEmpty {
            call.reject("Missing leaderboardId")
            return
        }

        NSLog("GameCenterPlugin submitting score=%ld context=%ld leaderboards=%@", score, context, leaderboardIDs.joined(separator: ","))
        GKLeaderboard.submitScore(
            score,
            context: context,
            player: GKLocalPlayer.local,
            leaderboardIDs: leaderboardIDs
        ) { [weak self] error in
            guard let self = self else { return }
            if let error = error {
                NSLog("GameCenterPlugin submitScore failed: %@", error.localizedDescription)
                self.reportLegacyScores(
                    score: score,
                    context: context,
                    leaderboardIDs: leaderboardIDs
                ) { legacyError in
                    if let legacyError = legacyError {
                        call.reject(
                            "Game Center score submit failed: \(error.localizedDescription); legacy report failed: \(legacyError.localizedDescription)",
                            nil,
                            legacyError
                        )
                        return
                    }

                    self.resolveSubmittedScore(
                        call,
                        score: score,
                        context: context,
                        leaderboardIDs: leaderboardIDs,
                        method: "legacy"
                    )
                }
                return
            }

            self.resolveSubmittedScore(
                call,
                score: score,
                context: context,
                leaderboardIDs: leaderboardIDs,
                method: "modern"
            )
        }
    }

    @objc func loadLeaderboard(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("Game Center player is not authenticated")
            return
        }

        guard let leaderboardID = call.getString("leaderboardId") ?? call.getString("leaderboardID") else {
            call.reject("Missing leaderboardId")
            return
        }

        let start = max(1, call.getInt("start", 1))
        let length = min(100, max(1, call.getInt("length", 25)))
        let timeScope = timeScope(from: call.getString("timeScope", "allTime"))
        let playerScope = playerScope(from: call.getString("playerScope", "global"))

        GKLeaderboard.loadLeaderboards(IDs: [leaderboardID]) { [weak self] leaderboards, error in
            guard let self = self else { return }

            if let error = error {
                call.reject(error.localizedDescription)
                return
            }

            guard let leaderboard = leaderboards?.first else {
                call.reject("Leaderboard not found")
                return
            }

            leaderboard.loadEntries(
                for: playerScope,
                timeScope: timeScope,
                range: NSRange(location: start, length: length)
            ) { localEntry, entries, totalPlayerCount, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }

                call.resolve([
                    "leaderboardId": leaderboardID,
                    "totalPlayerCount": totalPlayerCount,
                    "localPlayer": self.entryPayload(localEntry) ?? NSNull(),
                    "entries": (entries ?? []).compactMap { self.entryPayload($0) }
                ])
            }
        }
    }

    private func reportLegacyScores(
        score: Int,
        context: Int,
        leaderboardIDs: [String],
        completion: @escaping (Error?) -> Void
    ) {
        let scores = leaderboardIDs.map { leaderboardID in
            let scoreReporter = GKScore(leaderboardIdentifier: leaderboardID)
            scoreReporter.value = Int64(score)
            scoreReporter.context = UInt64(max(0, context))
            return scoreReporter
        }
        GKScore.report(scores) { error in
            if let error = error {
                NSLog("GameCenterPlugin legacy GKScore.report failed: %@", error.localizedDescription)
            } else {
                NSLog("GameCenterPlugin legacy GKScore.report succeeded for %@", leaderboardIDs.joined(separator: ","))
            }
            completion(error)
        }
    }

    private func resolveSubmittedScore(
        _ call: CAPPluginCall,
        score: Int,
        context: Int,
        leaderboardIDs: [String],
        method: String
    ) {
        verifySubmittedScore(leaderboardID: leaderboardIDs.first ?? "") { verifiedEntry, totalPlayerCount, verifyError in
            if let verifyError = verifyError {
                NSLog("GameCenterPlugin submit verification failed: %@", verifyError.localizedDescription)
            }
            call.resolve([
                "submitted": true,
                "method": method,
                "score": score,
                "context": context,
                "leaderboardIds": leaderboardIDs,
                "verificationError": verifyError?.localizedDescription ?? NSNull(),
                "verifiedLocalPlayer": self.entryPayload(verifiedEntry) ?? NSNull(),
                "verifiedTotalPlayerCount": totalPlayerCount
            ])
        }
    }

    private func verifySubmittedScore(
        leaderboardID: String,
        completion: @escaping (GKLeaderboard.Entry?, Int, Error?) -> Void
    ) {
        guard !leaderboardID.isEmpty else {
            completion(nil, 0, nil)
            return
        }
        GKLeaderboard.loadLeaderboards(IDs: [leaderboardID]) { leaderboards, error in
            if let error = error {
                completion(nil, 0, error)
                return
            }

            guard let leaderboard = leaderboards?.first else {
                completion(nil, 0, NSError(
                    domain: "GameCenterPlugin",
                    code: 404,
                    userInfo: [NSLocalizedDescriptionKey: "Leaderboard not found during submit verification"]
                ))
                return
            }

            leaderboard.loadEntries(
                for: .global,
                timeScope: .today,
                range: NSRange(location: 1, length: 1)
            ) { localEntry, _, totalPlayerCount, error in
                completion(localEntry, totalPlayerCount, error)
            }
        }
    }

    private func playerPayload(_ player: GKLocalPlayer) -> [String: Any] {
        [
            "authenticated": player.isAuthenticated,
            "alias": player.alias,
            "displayName": player.displayName,
            "gamePlayerId": player.gamePlayerID,
            "teamPlayerId": player.teamPlayerID
        ]
    }

    private func entryPayload(_ entry: GKLeaderboard.Entry?) -> [String: Any]? {
        guard let entry = entry else { return nil }
        return [
            "rank": entry.rank,
            "score": entry.score,
            "formattedScore": entry.formattedScore,
            "context": entry.context,
            "playerName": entry.player.displayName,
            "alias": entry.player.alias,
            "gamePlayerId": entry.player.gamePlayerID,
            "teamPlayerId": entry.player.teamPlayerID
        ]
    }

    private func timeScope(from value: String?) -> GKLeaderboard.TimeScope {
        switch value?.lowercased() {
        case "today":
            return .today
        case "week":
            return .week
        default:
            return .allTime
        }
    }

    private func playerScope(from value: String?) -> GKLeaderboard.PlayerScope {
        switch value?.lowercased() {
        case "friends", "friendsonly":
            return .friendsOnly
        default:
            return .global
        }
    }
}
