import CookieManager from '@react-native-cookies/cookies';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// Ensure we control when splash hides (ignore promise rejection if already prevented)
SplashScreen.preventAutoHideAsync().catch(() => {});

const APP_URL = 'https://zeitnahacademy.com';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [webViewLoaded, setWebViewLoaded] = useState(false); // true after first page load
  const [fontsReady] = useState(true); // (Optional) set to fontsLoaded if you actually load custom fonts
  const [splashHidden, setSplashHidden] = useState(false);
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

  // Hide splash only when WebView has loaded and (optionally) fonts are ready.
  useEffect(() => {
    if (!splashHidden && webViewLoaded && fontsReady) {
      // Small delay to avoid tearing/flicker between splash and first WebView paint
      const t = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
        setSplashHidden(true);
      }, 80);
      return () => clearTimeout(t);
    }
  }, [webViewLoaded, fontsReady, splashHidden]);

  // Navigation handler
  const handleNavChange = (navState: any) => {
    try {
      setCanGoBack(navState.canGoBack);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // WebView message handler (color scheme and logout)
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'colorScheme') {
        setStatusBarStyle(data.isDark ? 'light' : 'dark');
      }

      if (data.type === 'logout') {
        // Clear cookies & web storage
        CookieManager.clearAll(true).then(() => {
          console.log('Cookies cleared after logout');
          setWebViewKey(prev => prev + 1); // Reload WebView to fresh state
        });
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

  const handleLoadEnd = useCallback(() => {
    setWebViewLoaded(true);
  }, []);

  const injectedBeforeContent = `document.addEventListener('DOMContentLoaded', function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'domReady'}));});true;`;

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
      keyboardDisplayRequiresUserAction
      showsVerticalScrollIndicator={false}
      bounces={false}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      onNavigationStateChange={handleNavChange}
      onLoadEnd={handleLoadEnd}
      onError={handleWebViewError}
      onHttpError={handleWebViewHttpError}
      onMessage={handleMessage}
      scalesPageToFit={false}
      androidLayerType="hardware"
      setBuiltInZoomControls={false}
      startInLoadingState
      renderLoading={() => <View style={styles.webviewLoading} />}
      injectedJavaScriptBeforeContentLoaded={injectedBeforeContent}
      originWhitelist={["*"]}
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
      { backgroundColor: statusBarStyle === 'light' ? '#020100' : '#FFFFFF' }
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
    backgroundColor: '#020100',
  },
  container: {
    flex: 1,
    backgroundColor: '#020100',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webviewLoading: {
    flex: 1,
    backgroundColor: '#020100',
  },
});