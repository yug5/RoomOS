# RoomOS 🏠

A modern, mobile-first Progressive Web App (PWA) for roommates to manage shared expenses, chores, shopping lists, and more. Built with Next.js, TypeScript, and Supabase.


🔗 **[Live Demo](https://the-room-os.vercel.app)**

📚 **[GitHub Repository](https://github.com/yug5/RoomOS)**

## ✨ Features

### 💰 Expense Management
- Track shared expenses with custom split options (equal, percentage, or custom amounts)
- Automatic balance calculation
- Settle expenses individually or in groups
- UPI integration for instant payments
- Monthly expense filtering and summaries
- Recurring expenses support

### ✅ Chore Management
- Assign chores to roommates with due dates
- Mark chores as complete
- Track chore completion statistics
- Visual indication of pending tasks

### 🛒 Shopping Lists
- Shared shopping list with real-time sync
- Mark items as done
- Quick add from dashboard
- Swipe-to-delete functionality

### 📝 Notes & Communication
- Create shared notes for the room
- Real-time updates
- Quick reference for important info

### 🎯 Room Features
- Room health score based on pending tasks and unsettled expenses
- Quick polls for group decisions (yes/no voting)
- Mood status for each roommate
- Room activity feed showing all actions
- Room milestones and achievements
- Leaderboard with stats (chores, expenses, activity)

### 👥 Profiles & Settings
- Customizable avatar colors
- UPI ID for quick settlements
- Mood status indicators
- Roommate section with last seen and stats
- Profile editing and settings management

### 🔔 Notifications & Polish
- Toast notifications for all actions
- Optimistic updates for instant UI feedback
- Haptic feedback on all interactions
- Pull-to-refresh on all pages
- Offline indicator
- Smooth page transitions
- Empty states with personality
- Skeleton loading screens

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel
- **Icons**: Custom SVG
- **PWA**: next-pwa configuration ready

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Vercel account (optional, for deployment)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/room-os.git
cd room-os
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env.local`**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up Supabase Database**
Run these SQL commands in Supabase:
```sql
-- Tables are auto-created by the app, but ensure these columns exist:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_color text DEFAULT '#3a3a4a';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS splits jsonb;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS created_by uuid references profiles(id);
```

5. **Run development server**
```bash
npm run dev
```

6. **Open in browser**
http://localhost:3000


## 📁 Project Structure

src/
├── app/
│ ├── page.tsx # Dashboard
│ ├── expenses/page.tsx # Expenses management
│ ├── shopping/page.tsx # Shopping list
│ ├── chores/page.tsx # Chores management
│ ├── notes/page.tsx # Shared notes
│ ├── profile/page.tsx # User profile
│ ├── settings/page.tsx # Settings & preferences
│ ├── login/page.tsx # Auth login/signup
│ ├── onboarding/page.tsx # Room create/join
│ ├── auth/
│ │ └── reset-password/ # Password reset
│ ├── join/[code]/page.tsx # Join room via link
│ ├── layout.tsx # Root layout
│ └── globals.css # Global styles
├── components/
│ ├── BottomNav.tsx # Navigation bar
│ ├── GlassCard.tsx # Reusable glass card
│ ├── Toast.tsx # Toast notifications
│ ├── Skeleton.tsx # Loading skeletons
│ └── PageHeader.tsx # Page headers
├── lib/
│ ├── supabase.ts # Supabase client
│ ├── RoomContext.tsx # Global state context
│ └── hooks/useRoom.ts # Custom hooks
└── middleware.ts # Next.js middleware


## 🚀 Usage

### Create a Room
1. Sign up or login
2. Select "Create Room"
3. Give your room a name
4. Share the invite link with roommates

### Join a Room
1. Sign up or login
2. Select "Join Room"
3. Enter the invite code
4. Done!

### Add Expenses
1. Go to Expenses tab
2. Tap + button
3. Enter amount, category, who paid
4. Choose split type (equal/percent/custom)
5. Save

### Settle Up
1. View unsettled expenses
2. Swipe left on expense
3. Tap "Settle" button
4. Send payment via UPI link

### Manage Chores
1. Go to Chores tab
2. Add chore with assignee and due date
3. Check off when complete
4. Track completion stats on leaderboard

## 🌐 Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

2. **Connect to Vercel**
- Go to vercel.com
- Click "New Project"
- Select your GitHub repo
- Add environment variables from `.env.local`
- Deploy

3. **Update OAuth Redirects**
- Go to Supabase → Authentication → Providers
- Add your Vercel domain to OAuth redirect URLs

## 🔐 Security

- Authentication via Supabase Auth (email/password + Google)
- Row Level Security (RLS) can be enabled in Supabase
- All sensitive data encrypted in transit
- Session-based auth with secure tokens

## 📱 PWA Features

- Install on home screen (iOS & Android)
- Offline support (with caching)
- App icon and splash screen
- Fullscreen experience
- Push notifications ready

## 🐛 Known Issues & TODO

- [ ] Enable RLS policies on Supabase tables
- [ ] Add push notifications via OneSignal
- [ ] Implement expense history archiving
- [ ] Add advanced analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💬 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: support@roomos.app

## 🎯 Roadmap

- **v1.1**: Push notifications & reminders
- **v1.2**: Expense categories and budgeting
- **v1.3**: Chore rotation system
- **v1.4**: Room calendar integration
- **v2.0**: Multiple rooms & switching
