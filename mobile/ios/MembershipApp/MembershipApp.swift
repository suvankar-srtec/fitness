import SwiftUI

struct AppConfiguration: Decodable {
    let appName: String
    let websiteUrl: String
    static let current: AppConfiguration = {
        guard let file = Bundle.main.url(forResource: "app.config", withExtension: "json"),
              let data = try? Data(contentsOf: file),
              let config = try? JSONDecoder().decode(AppConfiguration.self, from: data),
              let url = URL(string: config.websiteUrl), url.scheme == "https", url.host != nil else {
            fatalError("The app requires a valid HTTPS website configuration.")
        }
        return config
    }()
    var website: URL { URL(string: websiteUrl)! }
    func trusted(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.scheme == "https" && url.host == website.host && (url.port ?? 443) == (website.port ?? 443) && url.user == nil
    }
}

@main
struct MembershipApp: App {
    var body: some Scene {
        WindowGroup { MembershipWebView().tint(Color(red: 0.08, green: 0.36, blue: 0.76)) }
    }
}

struct MembershipWebView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> MembershipController { MembershipController() }
    func updateUIViewController(_ controller: MembershipController, context: Context) {}
}
