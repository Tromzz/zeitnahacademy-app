import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  StyleSheet,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

const APP_URL = 'https://zeitnahacademy.com/';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [appReady, setAppReady] = useState(false);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [webViewKey, setWebViewKey] = useState(1);
  const [canGoBack, setCanGoBack] = useState(false);
  const [statusBarStyle, setStatusBarStyle] = useState<'light' | 'dark' | 'auto'>('light');

  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

  // Back button support for Android
  useEffect(() => {
    const handleBack = () => {
      if (webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true;
      }
      BackHandler.exitApp();
      return true;
    };

    if (Platform.OS === 'android') {
      const handler = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => handler.remove();
    }
  }, [canGoBack]);

  // App ready
  useEffect(() => {
    if ((fontsLoaded || fontError) && webViewLoaded) {
      SplashScreen.hideAsync().catch(console.error);
      setAppReady(true);
    }
  }, [fontsLoaded, fontError, webViewLoaded]);

  // Fallback splash timeout
  useEffect(() => {
    const timeout = setTimeout(() => setWebViewLoaded(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Navigation handler
  const handleNavChange = (navState: any) => {
    try {
      setCanGoBack(navState.canGoBack);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // WebView message handler (color scheme)
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'colorScheme') {
        setStatusBarStyle(data.isDark ? 'light' : 'dark');
      }
    } catch (err) {
      console.error('Error parsing message from WebView', err);
    }
  };

  // Error handlers
  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error: ', nativeEvent);
    setWebViewLoaded(true);
  };

  const handleWebViewHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView HTTP error: ', nativeEvent);
    setWebViewLoaded(true);
  };

  // Comprehensive zoom prevention JavaScript
  const injectedJavaScript = `
    (function() {
      // 1. Add viewport meta tag
      var meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      var head = document.getElementsByTagName('head')[0];
      if (head) {
        var existingViewport = head.querySelector('meta[name="viewport"]');
        if (existingViewport) {
          head.removeChild(existingViewport);
        }
        head.appendChild(meta);
      }

      // 2. Prevent pinch-to-zoom
      function preventZoom(e) {
        if (e.touches.length > 1) {
          e.preventDefault();
          e.stopPropagation();
        }
      }

      // 3. Prevent double-tap zoom
      var lastTouchEnd = 0;
      function preventDoubleTapZoom(e) {
        var now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
          e.stopPropagation();
        }
        lastTouchEnd = now;
      }

      // 4. Add event listeners
      document.addEventListener('touchstart', preventZoom, { passive: false });
      document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
      document.addEventListener('touchmove', preventZoom, { passive: false });

      // 5. Additional prevention for iOS
      document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
      }, { passive: false });

      // 6. Force scale to 1 if it changes
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function() {
          if (window.visualViewport.scale !== 1) {
            window.visualViewport.scale = 1;
          }
        });
      }

      // 7. Disable text size adjustment
      document.documentElement.style.webkitTextSizeAdjust = 'none';
      document.body.style.webkitTextSizeAdjust = 'none';

      // 8. Disable callout and selection
      document.documentElement.style.webkitTouchCallout = 'none';
      document.documentElement.style.userSelect = 'none';
      document.body.style.webkitTouchCallout = 'none';
      document.body.style.userSelect = 'none';

      // 9. Prevent zoom via keyboard
      document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '0')) {
          e.preventDefault();
        }
      });

      // 10. Mutation observer to ensure meta tag stays
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList') {
            var viewportMeta = document.querySelector('meta[name="viewport"]');
            if (!viewportMeta || !viewportMeta.content.includes('user-scalable=no')) {
              if (head) {
                var newMeta = document.createElement('meta');
                newMeta.name = 'viewport';
                newMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                if (viewportMeta) {
                  head.replaceChild(newMeta, viewportMeta);
                } else {
                  head.appendChild(newMeta);
                }
              }
            }
          }
        });
      });

      if (head) {
        observer.observe(head, { childList: true, subtree: true });
      }
    })();
    true;
  `;

  const WebViewComponent = (
    <WebView
      key={webViewKey}
      ref={webViewRef}
      source={{ uri: APP_URL }}
      style={styles.webview}
      javaScriptEnabled
      domStorageEnabled
      allowsFullscreenVideo
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      cacheEnabled
      scrollEnabled
      showsVerticalScrollIndicator={false}
      bounces={false}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      onNavigationStateChange={handleNavChange}
      onLoadEnd={() => setWebViewLoaded(true)}
      onError={handleWebViewError}
      onHttpError={handleWebViewHttpError}
      onMessage={handleMessage}
      injectedJavaScript={injectedJavaScript}
      injectedJavaScriptBeforeContentLoaded={`
        // Early viewport setup before content loads
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head = document.head || document.getElementsByTagName('head')[0];
        document.head.appendChild(meta);
        true;
      `}
      scalesPageToFit={false}
      androidLayerType="hardware"
      setBuiltInZoomControls={false}
    />
  );

  const containerStyle = [
    styles.container,
    { paddingTop: insets.top },
  ];

  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar style={statusBarStyle} />
      <View
        style={[
          ...containerStyle,
          { backgroundColor: statusBarStyle === 'light' ? '#000' : '#fff' }
        ]}
      >
        {WebViewComponent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});