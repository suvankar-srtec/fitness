import UIKit
import WebKit

final class MembershipController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    private let config = AppConfiguration.current
    private var web: WKWebView!
    private let spinner = UIActivityIndicatorView(style: .medium)
    private let retryPanel = UIStackView()
    private var downloads: [ObjectIdentifier: URL] = [:]
    private var invoiceView: WKWebView?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.08, green: 0.36, blue: 0.76, alpha: 1)
        let settings = WKWebViewConfiguration()
        settings.websiteDataStore = .default()
        settings.allowsInlineMediaPlayback = true
        if let script = Bundle.main.url(forResource: "native", withExtension: "js"), let source = try? String(contentsOf: script, encoding: .utf8) {
            settings.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        web = WKWebView(frame: .zero, configuration: settings)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.translatesAutoresizingMaskIntoConstraints = false
        web.isOpaque = false
        web.backgroundColor = .systemBackground
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor), web.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        spinner.color = .systemBlue
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinner)
        NSLayoutConstraint.activate([spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),spinner.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12)])
        retryPanel.axis = .vertical
        retryPanel.alignment = .center
        retryPanel.spacing = 20
        retryPanel.backgroundColor = .systemBackground
        retryPanel.isLayoutMarginsRelativeArrangement = true
        retryPanel.layoutMargins = UIEdgeInsets(top: 32,left: 24,bottom: 32,right: 24)
        retryPanel.translatesAutoresizingMaskIntoConstraints = false
        let title = UILabel(); title.text = config.appName; title.font = .preferredFont(forTextStyle: .title2); title.numberOfLines = 0; title.textAlignment = .center
        let message = UILabel(); message.text = "Unable to connect. Check your internet connection and try again."; message.numberOfLines = 0; message.textAlignment = .center
        let retry = UIButton(type: .system); retry.setTitle("Try again", for: .normal); retry.addTarget(self,action: #selector(reloadWebsite),for: .touchUpInside)
        let labels: [UIView] = [title,message,retry]
        labels.forEach(retryPanel.addArrangedSubview)
        view.addSubview(retryPanel)
        NSLayoutConstraint.activate([retryPanel.centerXAnchor.constraint(equalTo: view.centerXAnchor),retryPanel.centerYAnchor.constraint(equalTo: view.centerYAnchor),retryPanel.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor,constant: -24)])
        retryPanel.isHidden = true
        reloadWebsite()
    }
    @objc private func reloadWebsite() { retryPanel.isHidden = true; web.load(URLRequest(url: config.website)) }
    private func openExternal(_ url: URL) {
        guard ["https","mailto","tel","whatsapp"].contains(url.scheme ?? "") else { return }
        UIApplication.shared.open(url)
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "membership-print", action.targetFrame?.isMainFrame == true, config.trusted(webView.url),
           let encoded = URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedFragment,
           let html = encoded.removingPercentEncoding, html.utf8.count <= 512_000 {
            showInvoice(html); decisionHandler(.cancel); return
        }
        if config.trusted(url) {
            decisionHandler(action.shouldPerformDownload ? .download : .allow)
        } else if url.scheme == "blob", config.trusted(URL(string: String(url.absoluteString.dropFirst(5)))) {
            decisionHandler(.download)
        } else if action.targetFrame?.isMainFrame == false {
            decisionHandler(.allow)
        } else {
            openExternal(url); decisionHandler(.cancel)
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(response.canShowMIMEType ? .allow : .download)
    }
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { if webView === web { spinner.startAnimating() } }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if webView === invoiceView {
            let print = UIPrintInteractionController.shared
            print.printFormatter = webView.viewPrintFormatter()
            print.present(animated: true)
        } else { spinner.stopAnimating() }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        spinner.stopAnimating()
        if (error as NSError).code != NSURLErrorCancelled { retryPanel.isHidden = false }
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { self.webView(webView,didFailProvisionalNavigation: navigation,withError: error) }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { if config.trusted(url) { web.load(action.request) } else { openExternal(url) } }
        return nil
    }
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        let trusted = origin.protocol == "https" && origin.host == config.website.host && (origin.port == 0 ? 443 : origin.port) == (config.website.port ?? 443)
        decisionHandler(trusted && config.trusted(webView.url) && type == .camera ? .prompt : .deny)
    }
    private func showInvoice(_ html: String) {
        let settings = WKWebViewConfiguration()
        settings.defaultWebpagePreferences.allowsContentJavaScript = false
        let invoice = WKWebView(frame: view.bounds,configuration: settings)
        invoice.navigationDelegate = self
        invoiceView = invoice
        invoice.loadHTMLString(html,baseURL: config.website)
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString,isDirectory: true)
        do { try FileManager.default.createDirectory(at: folder,withIntermediateDirectories: true) }
        catch { completionHandler(nil); return }
        let name = (suggestedFilename as NSString).lastPathComponent
        let file = folder.appendingPathComponent(name.isEmpty ? "download" : name)
        downloads[ObjectIdentifier(download)] = file
        completionHandler(file)
    }
    func downloadDidFinish(_ download: WKDownload) {
        guard let file = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
        let picker = UIDocumentPickerViewController(forExporting: [file],asCopy: true)
        present(picker,animated: true)
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloads.removeValue(forKey: ObjectIdentifier(download))
        let alert = UIAlertController(title: "Download failed",message: "Please try downloading the file again.",preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK",style: .default));present(alert,animated: true)
    }
}
