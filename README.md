# Remvana - Simple Travel Planning Made Easy

🌍 **Plan trips like you text a friend**

Remvana is a consumer-friendly travel planning app that makes organizing your adventures as easy as having a conversation. With smart suggestions, bookable experiences, and a beautiful interface, travel planning has never been this simple.

## ✨ Features

### Trip Planning
- **Conversational Interface**: Create trips with natural, friendly prompts
- **Smart Suggestions**: AI-powered recommendations for activities and destinations
- **Visual Timeline**: See your entire trip at a glance
- **Flexible Dates**: Easy date picking with calendar integration

### Bookable Experiences
- **Viator Activities**: Browse and book thousands of activities worldwide
- **Flight Search**: Find the best flights with real-time pricing (via Duffel)
- **Affiliate Links**: Direct booking through trusted partners
- **Price Tracking**: See all costs in one place

### Collaboration
- **Share Trips**: Send your itinerary to friends and family
- **Real-time Updates**: Changes sync instantly
- **Notes & Todos**: Keep track of important details

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/remvana.git
cd remvana
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for authentication
- `DUFFEL_API_KEY` - For flight search (optional)
- `OPENAI_API_KEY` - For AI suggestions (optional)
- `VIATOR_API_KEY` - For activity search (optional)

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:5000` to see your app!

## 🎨 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS with purple/pink gradient design
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based auth
- **APIs**: Viator (activities), Duffel (flights), OpenAI (AI suggestions)

## 📱 Design Philosophy

Remvana follows a "5th grade reading level" design philosophy:
- Simple, conversational language
- Clear visual hierarchy
- Minimal cognitive load
- Delightful interactions

## 🚢 Deployment

### Railway (Recommended)
1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy with one click!

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this for your own projects!

## 🙏 Acknowledgments

Built with love for travelers who just want to plan amazing trips without the hassle.

---

**Questions?** Open an issue or reach out at support@remvana.app