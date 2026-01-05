# Stock Flow - Project Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Key Features](#key-features)
6. [Architecture](#architecture)
7. [Component Documentation](#component-documentation)
8. [Data Models](#data-models)
9. [Styling & Theming](#styling--theming)
10. [Development Workflow](#development-workflow)
11. [Building for Production](#building-for-production)
12. [Deployment](#deployment)

---

## Project Overview

**Stock Flow** is a modern inventory management system designed for tracking electronic devices. The application provides real-time monitoring of stock levels, price tracking, and comprehensive reporting features with a beautiful lavender-themed UI.

### Purpose
- Track inventory of electronic devices (smartphones, tablets, wearables)
- Monitor stock levels with automatic alerts
- Manage device grades (A, B, C) and pricing
- Generate reports and export data
- Visualize inventory metrics and trends

---

## Tech Stack

### Core Technologies
- **React 18.3.1** - UI library
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool and dev server
- **React Router DOM 6.30.1** - Client-side routing

### UI Framework
- **shadcn/ui** - Component library
- **Radix UI** - Headless UI primitives
- **Tailwind CSS 3.4.17** - Utility-first CSS
- **Lucide React** - Icon library

### State Management & Data
- **TanStack Query 5.83.0** - Server state management
- **React Hook Form 7.61.1** - Form handling
- **Zod 3.25.76** - Schema validation

### Additional Libraries
- **Recharts 2.15.4** - Data visualization
- **date-fns 3.6.0** - Date utilities
- **Sonner 1.7.4** - Toast notifications
- **class-variance-authority** - Component variants

---

## Project Structure

```
stock-flow/
├── public/                      # Static assets
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (40+ components)
│   │   ├── AppLayout.tsx       # Main layout wrapper
│   │   ├── AppSidebar.tsx      # Collapsible sidebar navigation
│   │   ├── Navbar.tsx          # Top navigation bar
│   │   ├── Footer.tsx          # Footer component
│   │   ├── InventoryTable.tsx  # Main inventory data grid
│   │   ├── FilterBar.tsx       # Filtering controls
│   │   ├── ExportActions.tsx   # Export functionality
│   │   ├── EmptyState.tsx      # Empty state UI
│   │   ├── GradeBadge.tsx      # Device grade badges
│   │   ├── StatusBadge.tsx     # Stock status indicators
│   │   ├── PriceChangeIndicator.tsx  # Price trend indicators
│   │   └── TableSkeleton.tsx   # Loading skeleton
│   ├── pages/
│   │   ├── Dashboard.tsx       # Analytics overview
│   │   ├── Inventory.tsx       # Inventory management
│   │   ├── Alerts.tsx          # Stock alerts
│   │   ├── Reports.tsx         # Reporting interface
│   │   ├── Settings.tsx        # App settings
│   │   └── NotFound.tsx        # 404 page
│   ├── data/
│   │   └── inventory.ts        # Data models and sample data
│   ├── hooks/
│   │   ├── use-mobile.tsx      # Mobile detection hook
│   │   └── use-toast.ts        # Toast notifications hook
│   ├── lib/
│   │   └── utils.ts            # Utility functions
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Application entry point
│   └── vite-env.d.ts          # Vite type definitions
├── components.json             # shadcn/ui configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
├── package.json               # Dependencies
└── README.md                  # Basic documentation
```

---

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd stock-flow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:8080`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

---

## Key Features

### 1. Dashboard (Dashboard.tsx)
- **Statistics Cards**: Total devices, units, inventory value, low stock alerts
- **Recent Activity Feed**: Real-time updates on stock changes
- **Top Value Devices**: Ranked list of highest-value inventory items
- **Trend Indicators**: Week-over-week comparisons

### 2. Inventory Management (Inventory.tsx)
- **Data Grid**: Comprehensive table of all inventory items
- **Filtering**: Filter by device name, grade, storage, and stock status
- **Search**: Full-text search across device names
- **Export**: Export data in multiple formats (CSV, PDF, Excel)
- **Sorting**: Multi-column sorting capabilities
- **Responsive Design**: Mobile-optimized table view

### 3. Stock Status Tracking
- **In Stock**: Quantity > 10 (green indicator)
- **Low Stock**: Quantity 5-10 (yellow indicator)
- **Critical**: Quantity < 5 (red indicator)

### 4. Price Monitoring
- **Price Change Indicators**: Up, down, or stable trends
- **Historical Tracking**: Last updated timestamps
- **CAD Currency Formatting**: Canadian dollar display

### 5. Device Grading System
- **Grade A**: Excellent condition
- **Grade B**: Good condition
- **Grade C**: Fair condition

---

## Architecture

### Routing Structure
```typescript
/ (root)                 → Dashboard
/inventory              → Inventory Management
/alerts                 → Stock Alerts
/reports                → Reports & Analytics
/settings               → Application Settings
* (wildcard)            → 404 Not Found
```

### Layout System
The application uses a consistent layout wrapper (`AppLayout.tsx`) that provides:
- Collapsible sidebar navigation (desktop)
- Mobile-responsive hamburger menu
- Top navigation bar
- Footer
- Main content area

### State Management Approach
- **TanStack Query**: Server state, caching, and data fetching
- **React Hook Form**: Form state management
- **Local State**: Component-specific state with useState
- **Context**: Minimal use for theme and global UI state

### Component Architecture
```
AppLayout
├── AppSidebar (navigation)
├── Navbar (header)
├── Main Content (children)
│   ├── Dashboard
│   ├── Inventory
│   ├── Alerts
│   ├── Reports
│   └── Settings
└── Footer
```

---

## Component Documentation

### Core Components

#### AppLayout (AppLayout.tsx)
Main layout wrapper providing consistent structure across all pages.

**Props:**
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}
```

**Features:**
- Sidebar state management
- Responsive mobile/desktop layouts
- Scroll handling

#### AppSidebar (AppSidebar.tsx)
Collapsible sidebar navigation with mobile overlay.

**Props:**
```typescript
interface AppSidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}
```

**Navigation Items:**
- Dashboard - Home overview
- Inventory - Stock management
- Alerts - Low stock notifications
- Reports - Analytics and exports
- Settings - Configuration

#### InventoryTable (InventoryTable.tsx)
Primary data grid for displaying inventory items.

**Features:**
- Column sorting
- Row selection
- Status indicators
- Grade badges
- Price change indicators
- Responsive design

#### FilterBar (FilterBar.tsx)
Provides filtering and search capabilities.

**Filter Types:**
- Text search
- Grade selection (A/B/C)
- Storage capacity
- Stock status
- Date range

#### EmptyState (EmptyState.tsx)
User-friendly empty state when no data matches filters.

**Props:**
```typescript
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}
```

### UI Components (src/components/ui/)

All UI components are from shadcn/ui, customized with the project's theme:

**Form Components:**
- Button, Input, Select, Checkbox, Switch
- Form, Label, Textarea
- Radio Group, Slider

**Overlay Components:**
- Dialog, Alert Dialog, Sheet, Drawer
- Popover, Dropdown Menu, Context Menu
- Tooltip, Hover Card

**Display Components:**
- Card, Badge, Avatar, Separator
- Table, Accordion, Tabs, Collapsible
- Skeleton (loading states)

**Feedback Components:**
- Toast, Sonner (notifications)
- Alert, Progress

---

## Data Models

### InventoryItem Interface
```typescript
export interface InventoryItem {
  id: string;                    // Unique identifier
  deviceName: string;            // Device model name
  grade: 'A' | 'B' | 'C';       // Condition grade
  storage: string;               // Storage capacity (e.g., "128GB")
  quantity: number;              // Units in stock
  pricePerUnit: number;          // Price in CAD
  lastUpdated: string;           // Last update timestamp
  priceChange?: 'up' | 'down' | 'stable';  // Price trend
}
```

### Stock Status Type
```typescript
export type StockStatus = 'in-stock' | 'low-stock' | 'critical';
```

### Utility Functions (data/inventory.ts)

**getStockStatus(quantity: number): StockStatus**
```typescript
// Returns stock status based on quantity thresholds
if (quantity > 10) return 'in-stock';
if (quantity >= 5) return 'low-stock';
return 'critical';
```

**formatPrice(price: number): string**
```typescript
// Formats price as Canadian dollars
return `$${price.toLocaleString()} CAD`;
```

### Sample Data
The application includes 9 sample devices:
- Apple Watch Series 7
- Google Pixel 7a, 8, 8 Pro
- iPhone 13, 14 Pro
- Samsung Galaxy S23
- HMD Aura, HMD Pulse Pro

---

## Styling & Theming

### Color System

The application uses a **lavender-inspired color palette**:

#### Primary Colors
```css
--primary: 243 75% 59%           /* Lavender purple */
--primary-foreground: 0 0% 100%  /* White text */
```

#### Semantic Colors
```css
--success: 142 76% 36%           /* Green for positive actions */
--warning: 38 92% 50%            /* Orange for warnings */
--destructive: 0 84% 60%         /* Red for errors/critical */
```

#### UI Colors
```css
--background: 0 0% 100%          /* White background */
--foreground: 240 10% 4%         /* Near-black text */
--card: 0 0% 100%                /* Card backgrounds */
--border: 240 6% 90%             /* Subtle borders */
--muted: 240 5% 96%              /* Muted backgrounds */
```

#### Sidebar Colors
```css
--sidebar-background: 260 60% 98%      /* Light lavender */
--sidebar-foreground: 240 5% 26%      /* Dark gray text */
--sidebar-primary: 243 75% 59%        /* Active item color */
--sidebar-accent: 243 75% 95%         /* Hover state */
```

### Custom Utilities

#### Shadows
```css
.shadow-soft {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
```

#### Animations
- `fade-in`: Smooth entrance animation
- `pulse-soft`: Gentle loading pulse
- `accordion-down/up`: Collapsible animations

### Responsive Breakpoints
```typescript
sm: '640px'   // Small devices
md: '768px'   // Tablets
lg: '1024px'  // Laptops
xl: '1280px'  // Desktops
2xl: '1536px' // Large displays
```

### Font Family
```css
font-family: 'Roboto', system-ui, sans-serif;
```

---

## Development Workflow

### Code Style

**TypeScript Configuration:**
- Strict mode enabled
- Path aliases configured (`@/` → `src/`)
- ES2020 target

**ESLint Rules:**
- React hooks validation
- React refresh support
- TypeScript-specific rules

### Component Development Pattern

1. **Create Component File**
   ```typescript
   // src/components/MyComponent.tsx
   import { cn } from '@/lib/utils';

   interface MyComponentProps {
     // Define props with TypeScript
   }

   export function MyComponent({ ...props }: MyComponentProps) {
     // Implementation
   }
   ```

2. **Add Styling**
   Use Tailwind classes with `cn()` utility for conditional styling:
   ```typescript
   className={cn(
     "base-classes",
     condition && "conditional-classes"
   )}
   ```

3. **Import in Parent**
   ```typescript
   import { MyComponent } from '@/components/MyComponent';
   ```

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `App.tsx`:
   ```typescript
   <Route
     path="/new-page"
     element={
       <AppLayout>
         <NewPage />
       </AppLayout>
     }
   />
   ```
3. Add navigation link in `AppSidebar.tsx`:
   ```typescript
   { label: 'New Page', icon: IconComponent, href: '/new-page' }
   ```

### Adding shadcn/ui Components

```bash
npx shadcn-ui@latest add [component-name]
```

This will:
- Download the component to `src/components/ui/`
- Configure it with your theme
- Add necessary dependencies

### Working with Data

**Mock Data** (src/data/inventory.ts):
- Currently uses static data
- Ready to replace with API calls

**To Add Real API:**
1. Create API service:
   ```typescript
   // src/services/api.ts
   export async function fetchInventory() {
     const response = await fetch('/api/inventory');
     return response.json();
   }
   ```

2. Use TanStack Query:
   ```typescript
   const { data, isLoading } = useQuery({
     queryKey: ['inventory'],
     queryFn: fetchInventory
   });
   ```

---

## Building for Production

### Production Build

```bash
npm run build
```

This will:
- Compile TypeScript
- Bundle and optimize assets
- Tree-shake unused code
- Minify CSS and JavaScript
- Output to `dist/` directory

### Build Output
```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [images/fonts]
└── index.html
```

### Preview Production Build

```bash
npm run preview
```

Access at `http://localhost:4173`

### Build Optimization

The project is configured for optimal production builds:

**Vite Optimizations:**
- Code splitting
- Asset optimization
- CSS minification
- Dead code elimination

**React Optimizations:**
- React Fast Refresh (dev)
- SWC compiler for faster builds
- Lazy loading ready

### Environment Variables

Create `.env` file for environment-specific config:
```env
VITE_API_URL=https://api.example.com
VITE_APP_NAME=Stock Flow
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## Deployment

### Lovable Deployment (Recommended)

1. Visit your [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID)
2. Click **Share → Publish**
3. Your app will be deployed automatically

### Custom Domain

1. Navigate to **Project > Settings > Domains**
2. Click **Connect Domain**
3. Follow DNS configuration instructions

### Other Deployment Options

#### Vercel
```bash
npm install -g vercel
vercel
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Static Hosting
Upload contents of `dist/` folder to:
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting
- Cloudflare Pages

### Pre-Deployment Checklist

- [ ] Run `npm run lint` - No errors
- [ ] Run `npm run build` - Successful build
- [ ] Test production build with `npm run preview`
- [ ] Check responsive design on multiple devices
- [ ] Verify all routes work correctly
- [ ] Test all interactive features
- [ ] Update `README.md` with project URL
- [ ] Configure environment variables
- [ ] Set up error tracking (optional)
- [ ] Configure analytics (optional)

---

## Additional Resources

### Documentation Links
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Router](https://reactrouter.com)

### Component Libraries
- [Radix UI](https://www.radix-ui.com) - Headless components
- [Lucide Icons](https://lucide.dev) - Icon set
- [Recharts](https://recharts.org) - Charts

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Tailwind CSS Playground](https://play.tailwindcss.com)
- [Can I Use](https://caniuse.com) - Browser compatibility

---

## Troubleshooting

### Common Issues

**Port 8080 already in use:**
```bash
# Change port in vite.config.ts
server: {
  port: 3000
}
```

**Module not found errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors after adding new dependencies:**
```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

**Styles not applying:**
- Check Tailwind configuration
- Verify import of `./src/index.css`
- Clear browser cache

**Build fails:**
- Check for TypeScript errors
- Verify all imports are correct
- Ensure all dependencies are installed

---

## Contributing

### Code Standards
- Use TypeScript for all new files
- Follow existing component patterns
- Write descriptive commit messages
- Add comments for complex logic
- Keep components focused and reusable

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add: your feature description"

# Push to remote
git push origin feature/your-feature-name
```

---

## Support

For issues or questions:
- Check existing GitHub issues
- Review this documentation
- Consult official library documentation
- Reach out to the development team

---

**Last Updated:** January 5, 2026
**Version:** 0.0.0
**Maintained by:** Stock Flow Team
