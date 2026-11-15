package in.ac.rit.roombites;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Ensure webview content stays cleanly within safe screen bounds and never overlaps the status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
