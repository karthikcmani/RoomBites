package in.ac.rit.roombites;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Ensure webview content stays cleanly within safe screen bounds and never overlaps the status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        if (this.bridge != null) {
            this.bridge.setWebViewClient(new BridgeWebViewClient(this.bridge) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri url = request.getUrl();
                    if (handleUpiLaunch(url)) {
                        return true;
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }

                @Deprecated
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url != null && handleUpiLaunch(Uri.parse(url))) {
                        return true;
                    }
                    return super.shouldOverrideUrlLoading(view, url);
                }

                private boolean handleUpiLaunch(Uri url) {
                    if (url == null) return false;
                    String scheme = url.getScheme();
                    if (scheme == null) return false;

                    String s = scheme.toLowerCase();
                    if (s.equals("upi") || s.equals("tez") || s.equals("phonepe") || s.equals("paytmmp")) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, url);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            // If it's generic upi://, open chooser
                            if (s.equals("upi")) {
                                Intent chooser = Intent.createChooser(intent, "Pay with UPI");
                                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(chooser);
                            } else {
                                startActivity(intent);
                            }
                            return true;
                        } catch (Exception e) {
                            try {
                                Intent fallback = new Intent(Intent.ACTION_VIEW, url);
                                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(Intent.createChooser(fallback, "Pay via UPI App"));
                                return true;
                            } catch (Exception ex) {
                                Toast.makeText(MainActivity.this, "Unable to launch UPI app. Please scan the QR code or copy UPI ID.", Toast.LENGTH_LONG).show();
                                return true;
                            }
                        }
                    }
                    return false;
                }
            });
        }
    }
}
