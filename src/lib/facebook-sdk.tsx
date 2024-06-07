interface FbInitOptions {
  appId: string;
  cookie: boolean;
  xfbml: boolean;
  version: string;
}

export interface FbResponse {
  status: string;
  authResponse: {
    accessToken: string;
    expiresIn: number;
    reauthorize_required_in: number;
    signedRequest: string;
    userID: string;
  };
}

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (options: FbInitOptions) => void;
      getLoginStatus: (callback: (response: FbResponse) => void) => void;
      login: (
        callback: (response: FbResponse) => void,
        options?: { scope: string }
      ) => void;
      logout: (callback: (response: FbResponse) => void) => void;
    };
  }
}

// The app id used.
const APP_ID = "975314003763320";

export const initFacebookSdk = (): Promise<void> =>
  new Promise((resolve, reject) => {
    // Load the Facebook SDK asynchronously
    window.fbAsyncInit = () => {
      const fbInitOptions: FbInitOptions = {
        appId: APP_ID,
        cookie: true,
        xfbml: true,
        version: "v17.0",
      };
      window.FB.init(fbInitOptions);
      // Resolve the promise when the SDK is loaded
      resolve();
    };

    // load facebook sdk script
    (function (d, s, id) {
      let js: HTMLScriptElement;
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {
        return;
      }
      js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    })(document, "script", "facebook-jssdk");
  });

export const getFacebookLoginStatus = (): Promise<FbResponse> =>
  new Promise((resolve, reject) => {
    window.FB.getLoginStatus((response: FbResponse) => {
      resolve(response);
    });
  });

export const fbLogin = (): Promise<FbResponse> =>
  new Promise((resolve, reject) => {
    window.FB.login(
      (response: FbResponse) => {
        resolve(response);
      },
      { scope: "public_profile" }
    );
  });

export const fbLogout = (): Promise<FbResponse> =>
  new Promise((resolve, reject) => {
    window.FB.logout((response: FbResponse) => {
      resolve(response);
    });
  });
