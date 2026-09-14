# PSRUF Mobile

Expo + React Native mobile client for the existing PSRUF backend and MongoDB database.

## Stack

- Expo / React Native
- Expo Router for file-based navigation
- NativeWind for utility-first styling
- Moti + React Native Reanimated for animation
- Axios and Socket.IO client for backend communication
- Expo SecureStore for persisted auth state

## Environment

Copy `.env.example` to `.env` and set the API origin you want the app to use.

```bash
EXPO_PUBLIC_API_URL=https://psruf-website-2026.onrender.com
EXPO_PUBLIC_SOCKET_URL=https://psruf-website-2026.onrender.com
```

For local backend work:

- iOS simulator defaults to `http://localhost:5000` when `EXPO_PUBLIC_API_URL` is unset.
- Android emulator defaults to `http://10.0.2.2:5000` when `EXPO_PUBLIC_API_URL` is unset.
- Physical devices should use an explicit `EXPO_PUBLIC_API_URL` pointing at your machine or deployed backend.

## Commands

```bash
npm install
npm run start
npm run android
npm run ios
```

## Current scope

This starter includes:

- Public welcome flow
- Login against `/api/auth/login`
- Session refresh against `/api/auth/me`
- Member tabs for dashboard, events, feed, and profile
- Feed channel loading from `/api/channels`
- Feed post loading from `/api/feeds/:feed/posts`
- Realtime `post:created` updates through Socket.IO

It does not yet port every website screen. The structure is set up so those screens can be added incrementally under the same auth and navigation model.
