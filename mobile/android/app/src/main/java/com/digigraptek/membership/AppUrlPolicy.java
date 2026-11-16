package com.digigraptek.membership;

import java.net.URI;
import java.util.Arrays;

/** Keep authenticated web content and camera access on the configured HTTPS origin. */
final class AppUrlPolicy {
    private final URI origin;
    AppUrlPolicy(String website) {
        origin = URI.create(website);
        if (!"https".equals(origin.getScheme()) || origin.getHost() == null || origin.getUserInfo() != null)
            throw new IllegalArgumentException("A public HTTPS website is required");
    }
    boolean trusted(String value) {
        try {
            URI url = URI.create(value);
            return "https".equalsIgnoreCase(url.getScheme()) && url.getUserInfo() == null
                && origin.getHost().equalsIgnoreCase(url.getHost()) && port(origin) == port(url);
        } catch (RuntimeException error) { return false; }
    }
    boolean external(String value) {
        try { return Arrays.asList("https", "mailto", "tel", "whatsapp").contains(URI.create(value).getScheme()); }
        catch (RuntimeException error) { return false; }
    }
    private static int port(URI value) { return value.getPort() == -1 ? 443 : value.getPort(); }
}
