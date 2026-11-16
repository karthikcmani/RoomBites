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
                            String targetPackage = null;
                            String app = url.getQueryParameter("app");
                            if ("gpay".equalsIgnoreCase(app) || s.equals("tez")) {
                                targetPackage = "com.google.android.apps.nbu.paisa.user";
                            } else if ("phonepe".equalsIgnoreCase(app) || s.equals("phonepe")) {
                                targetPackage = "com.phonepe.app";
                            } else if ("paytm".equalsIgnoreCase(app) || s.equals("paytmmp")) {
                                targetPackage = "net.one97.paytm";
                            } else if ("bhim".equalsIgnoreCase(app)) {
                                targetPackage = "in.org.npci.upiapp";
                            }

                            // Build clean standard NPCI UPI URI
                            Uri.Builder cleanBuilder = new Uri.Builder()
                                    .scheme("upi")
                                    .authority("pay");

                            for (String key : url.getQueryParameterNames()) {
                                if (!"app".equalsIgnoreCase(key) && !"package".equalsIgnoreCase(key)) {
                                    cleanBuilder.appendQueryParameter(key, url.getQueryParameter(key));
                                }
                            }
                            Uri cleanUpiUri = cleanBuilder.build();
                            String amount = cleanUpiUri.getQueryParameter("am");
                            String amountLabel = (amount != null && !amount.isEmpty()) ? " ₹" + amount : "";

                            if (targetPackage != null) {
                                Intent directIntent = new Intent(Intent.ACTION_VIEW, cleanUpiUri);
                                directIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                directIntent.setPackage(targetPackage);

                                if (directIntent.resolveActivity(getPackageManager()) != null) {
                                    startActivity(directIntent);
                                    return true;
                                }
                                // Fall back to chooser if target app is missing
                                Toast.makeText(MainActivity.this, "Selected app not found. Opening available UPI apps...", Toast.LENGTH_SHORT).show();
                            }

                            Intent intent = new Intent(Intent.ACTION_VIEW, cleanUpiUri);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            Intent chooser = Intent.createChooser(intent, "Pay" + amountLabel + " with UPI");
                            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                            if (chooser.resolveActivity(getPackageManager()) != null) {
                                startActivity(chooser);
                            } else {
                                Toast.makeText(MainActivity.this, "No compatible UPI app found. Please scan the QR code or copy the UPI ID.", Toast.LENGTH_LONG).show();
                            }
                            return true;
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "Unable to launch UPI app. Please scan the QR code or copy UPI ID.", Toast.LENGTH_LONG).show();
                            return true;
                        }
                    }
                    return false;
                }
            });
        }
    }
}
