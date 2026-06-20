import Capacitor

@objc(BridgeViewController)
open class BridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(AppReviewPlugin())
        bridge?.registerPluginInstance(GameCenterPlugin())
        bridge?.registerPluginInstance(UnityAdsPlugin())
    }
}
