# LockIn - Focus Competition App

A mobile app that helps students and knowledge-workers trade distraction for deep work through playful competition.

## Project Structure

```
src/
├── frontend/
│   ├── screens/         # React Native screens
│   │   ├── auth/       # Authentication screens
│   │   └── home/       # Main app screens
│   ├── components/     # Reusable React components
│   ├── navigation/     # React Navigation setup
│   ├── styles/        # Global styles and themes
│   └── tests/         # Frontend unit tests
├── backend/
│   ├── models/        # Supabase database models
│   ├── services/      # Business logic and API services
│   └── tests/         # Backend unit tests
├── lib/              # Shared utilities and configurations
├── types/            # TypeScript type definitions
└── utils/            # Helper functions
```

## Tech Stack

- **Frontend**: React Native with Expo (managed workflow)
- **Backend**: Supabase (PostgreSQL + Row Level Security)
- **State Management**: React Context + Zustand
- **Styling**: TailwindCSS via NativeWind
- **Testing**: Jest + React Native Testing Library

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env` file in the root directory with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your preferred platform:
   ```bash
   npm run ios     # for iOS
   npm run android # for Android
   npm run web     # for web
   ```

## Testing

Run tests with:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Project Goals

1. Help users maintain focus through:
   - 30/60-min focus timers
   - Social app blocking
   - Coin-based rewards
2. Create healthy competition via:
   - Daily opponent matching
   - Coin-based scoring
   - Taunts and notifications

## Contributing

1. Follow the project structure
2. Ensure tests are written for new features
3. Follow the style guide in PLANNING.md
4. Update documentation as needed

## Non-Functional Requirements

- Time-zone aware (resets at local 07:00)
- Accessibility support
- Privacy-first design
- Performance optimized
- Battery efficient

For more details, see PLANNING.md 