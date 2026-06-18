import Capacitor
import StoreKit
import UIKit

@objc(AppReviewPlugin)
public class AppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppReviewPlugin"
    public let jsName = "AppReviewPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppStoreReview", returnType: CAPPluginReturnPromise)
    ]

    private let appStoreReviewUrl = "itms-apps://itunes.apple.com/app/id6771701538?action=write-review"

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if #available(iOS 14.0, *) {
                if let scene = UIApplication.shared.connectedScenes.first(where: {
                    $0.activationState == .foregroundActive
                }) as? UIWindowScene {
                    SKStoreReviewController.requestReview(in: scene)
                    call.resolve(["requested": true])
                    return
                }
            }

            SKStoreReviewController.requestReview()
            call.resolve(["requested": true])
        }
    }

    @objc func openAppStoreReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: self.appStoreReviewUrl) else {
                call.resolve(["opened": false])
                return
            }

            UIApplication.shared.open(url, options: [:]) { opened in
                call.resolve(["opened": opened])
            }
        }
    }
}
