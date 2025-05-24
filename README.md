# Expo + Supabase Template

A template project with Expo and Supabase integration.

## Tech Stack

- React Native with Expo
- TypeScript
- Supabase for backend
- React Navigation for routing

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run on your preferred platform:
   ```bash
   npm run ios     # for iOS
   npm run android # for Android
   npm run web     # for web
   ```

## Environment Setup

1. Create a `.env` file in the root directory
2. Add your Supabase configuration:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Project Structure

- `/src` - Source code
  - `/components` - Reusable React components
  - `/screens` - App screens
  - `/navigation` - Navigation configuration
  - `/services` - API and service integrations
  - `/utils` - Helper functions and utilities
  - `/types` - TypeScript type definitions
  - `/hooks` - Custom React hooks
  - `/constants` - App constants and configuration

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 