package com.digigraptek.membership;

import org.junit.Test;
import static org.junit.Assert.*;

public final class AppUrlPolicyTest {
    private final AppUrlPolicy policy = new AppUrlPolicy("https://fitness-eight-lovat.vercel.app/");
    @Test public void ownHttpsPagesAndDownloadsStayInsideTheApp() {
        assertTrue(policy.trusted("https://fitness-eight-lovat.vercel.app/"));
        assertTrue(policy.trusted("https://fitness-eight-lovat.vercel.app:443/api/gate-pass?id=91"));
        assertTrue(policy.trusted("https://FITNESS-EIGHT-LOVAT.VERCEL.APP/api/member-pass"));
    }
    @Test public void lookalikeHostsPortsAndCredentialsDoNotReceiveNativeAccess() {
        assertFalse(policy.trusted("https://fitness-eight-lovat.vercel.app.evil.example/"));
        assertFalse(policy.trusted("https://fitness-eight-lovat.vercel.app@evil.example/"));
        assertFalse(policy.trusted("https://user@fitness-eight-lovat.vercel.app/"));
        assertFalse(policy.trusted("https://fitness-eight-lovat.vercel.app:8443/"));
        assertFalse(policy.trusted("http://fitness-eight-lovat.vercel.app/"));
        assertFalse(policy.trusted(null));
    }
    @Test public void externalLinksUseOnlySupportedSafeSchemes() {
        assertTrue(policy.external("tel:+919230965297"));
        assertTrue(policy.external("mailto:info@digigraptek.com"));
        assertTrue(policy.external("https://wa.me/919230965297"));
        assertFalse(policy.external("javascript:alert(1)"));
        assertFalse(policy.external("file:///data/data/private"));
        assertFalse(policy.external("content://private/database"));
        assertFalse(policy.external("intent://anything#Intent;end"));
    }
    @Test(expected=IllegalArgumentException.class) public void configurationCannotEnableCleartext() {
        new AppUrlPolicy("http://fitness-eight-lovat.vercel.app/");
    }
}
