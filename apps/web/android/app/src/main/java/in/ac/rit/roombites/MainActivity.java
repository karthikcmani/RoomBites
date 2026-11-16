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
                    if (url != null && "upi".equalsIgnoreCase(url.getScheme())) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, url);
                            Intent chooser = Intent.createChooser(intent, "Pay via UPI App");
                            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(chooser);
                            return true;
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "Unable to open UPI app. Please copy the UPI ID.", Toast.LENGTH_SHORT).show();
                            return true;
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }

                @Deprecated
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url != null && url.startsWith("upi://")) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            Intent chooser = Intent.createChooser(intent, "Pay via UPI App");
                            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(chooser);
                            return true;
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "Unable to open UPI app. Please copy the UPI ID.", Toast.LENGTH_SHORT).show();
                            return true;
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, url);
                }
            });
        }
    }
}
