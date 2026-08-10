import Capacitor
import UIKit

@objc(ReferralSharePlugin)
public class ReferralSharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReferralSharePlugin"
    public let jsName = "ReferralSharePlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise)
    ]

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
