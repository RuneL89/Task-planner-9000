# Task Management Application

## Overview

A modern full-stack task management application built with React and Express, featuring a visual canvas-based interface for organizing tasks and their relationships. The application provides comprehensive task management capabilities including hierarchical task structures, interactive node-based visualization using React Flow, and mobile-optimized touch interactions. Now includes a dedicated Completed Tasks view with time-based filtering.

## Recent Changes (September 2025)

### Mobile Experience Improvements
- **Collapsible Sidebar**: Sidebar now collapses on both mobile and desktop with toggle buttons, improving screen space utilization
- **Enhanced Touch Interactions**: TaskNode buttons and connection handles are larger on mobile (40x40px vs 24x24px) for better touch accuracy
- **Responsive useIsMobile Hook**: Updated to use React's useSyncExternalStore for synchronous mobile detection, eliminating UI flicker

### Completed Tasks Feature
- **New Page**: Added `/completed-tasks` route with dedicated list view for finished tasks
- **Completion Tracking**: Tasks now track `completedAt` timestamp when marked as complete
- **Time Filters**: Filter completed tasks by 1 week, 2 weeks, 3 weeks, 4 weeks, or view all
- **Status Badges**: Shows "On Time" or "Completed Late" based on deadline comparison
- **Navigation**: Accessible from sidebar and top navigation with completion count badge

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The client uses a modern React architecture with TypeScript:

- **UI Framework**: React with TypeScript, using Vite as the build tool
- **Component Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Visual Interface**: React Flow (@xyflow/react) for canvas-based task visualization
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation

The frontend follows a component-based architecture with:
- Reusable UI components in `/components/ui/`
- Feature-specific components for tasks, modals, and canvas
- Custom hooks for data fetching and business logic
- Responsive design with mobile-first approach

### Backend Architecture

The server uses Express.js with TypeScript in ESM format:

- **Web Framework**: Express.js with middleware for JSON parsing and request logging
- **Database Layer**: Drizzle ORM with PostgreSQL via Neon serverless
- **API Design**: RESTful endpoints following conventional patterns
- **Data Validation**: Zod schemas for request/response validation
- **Development**: Hot reloading with tsx and Vite integration

The backend implements a storage abstraction pattern with:
- Interface-based storage layer for testability
- Database implementation using Drizzle queries
- Comprehensive CRUD operations for all entities
- Relational data handling with joins and relations

### Data Storage Solutions

**Database**: PostgreSQL (configured for Neon serverless deployment)

**Schema Design**:
- **Tasks**: Core entity with hierarchical relationships, positioning data, completion tracking, and metadata
- **Time Entries**: Time tracking with start/end times and duration calculation
- **Task Connections**: Many-to-many relationships for task dependencies
- **Relations**: Comprehensive foreign key relationships and cascade handling

**Key Features**:
- Self-referencing parent-child relationships for task hierarchy
- Positional data for canvas layout persistence
- Flexible status and priority enums
- Automatic timestamp management (createdAt, updatedAt, completedAt)
- Completion tracking with completedAt timestamp for analytics and filtering

### Authentication and Authorization

Currently implements a foundation for session-based authentication:
- Session store configuration using connect-pg-simple
- Cookie-based session management
- Prepared for user authentication integration

### External Dependencies

**Core Production Dependencies**:
- `@neondatabase/serverless`: PostgreSQL serverless driver for Neon
- `drizzle-orm` & `drizzle-kit`: Type-safe ORM and migration tools
- `@xyflow/react`: Interactive node-based UI library
- `@tanstack/react-query`: Server state management
- `@radix-ui/*`: Headless UI component primitives
- `react-hook-form` & `@hookform/resolvers`: Form handling and validation
- `zod`: Schema validation and type inference
- `tailwindcss`: Utility-first CSS framework

**Development Tools**:
- `vite`: Fast build tool and dev server
- `typescript`: Static type checking
- `tsx`: TypeScript execution for development
- `esbuild`: JavaScript bundler for production builds

**Database Integration**:
- Requires `DATABASE_URL` environment variable
- Uses connection pooling for serverless environments
- WebSocket constructor override for Neon compatibility

The application is structured as a monorepo with shared schema definitions, enabling type safety across the full stack while maintaining clear separation of concerns between client and server code.