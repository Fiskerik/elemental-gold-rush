import Capacitor
import UIKit

@objc(ReferralSharePlugin)
public class ReferralSharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReferralSharePlugin"
    public let jsName = "ReferralSharePlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "promptForCode", returnType: CAPPluginReturnPromise)
    ]

    @objc func promptForCode(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("Referral code entry is unavailable")
                return
            }

            let controller = UIAlertController(
                title: call.getString("title") ?? "Enter referral code",
                message: nil,
                preferredStyle: .alert
            )
            controller.addTextField { textField in
                textField.placeholder = "AFR-XXXXXXX"
                textField.text = call.getString("value")
                textField.autocapitalizationType = .allCharacters
                textField.autocorrectionType = .no
                textField.spellCheckingType = .no
                textField.smartDashesType = .no
                textField.smartQuotesType = .no
                textField.clearButtonMode = .whileEditing
                textField.returnKeyType = .done
            }
            controller.addAction(UIAlertAction(
                title: call.getString("cancelTitle") ?? "Cancel",
                style: .cancel
            ) { _ in
                call.resolve(["cancelled": true])
            })
            controller.addAction(UIAlertAction(
                title: call.getString("confirmTitle") ?? "Use code",
                style: .default
            ) { _ in
                let code = controller.textFields?.first?.text ?? ""
                call.resolve(["cancelled": false, "code": code])
            })

            presenter.present(controller, animated: true)
        }
    }

    @objc func share(_ call: CAPPluginCall) {
        guard let text = call.getString("text")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !text.isEmpty else {
            call.reject("Text is required")
            return
        }

        DispatchQueue.main.async {
            let controller = UIActivityViewController(activityItems: [text], applicationActivities: nil)
            controller.completionWithItemsHandler = { _, completed, _, _ in
                call.resolve(["completed": completed])
            }

            if let popover = controller.popoverPresentationController {
                popover.sourceView = self.bridge?.viewController?.view
                popover.sourceRect = self.bridge?.viewController?.view.bounds ?? .zero
                popover.permittedArrowDirections = []
            }

            guard let presenter = self.bridge?.viewController else {
                call.reject("Share sheet is unavailable")
                return
            }
            presenter.present(controller, animated: true)
        }
    }
}
