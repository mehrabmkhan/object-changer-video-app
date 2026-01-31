# Object Changer Video App

## Overview
A web-based application that enables object replacement in video using AI-powered image generation workflows.

## Features
- Interactive React-based frontend
- Real-time preview and rendering flow
- AI-powered object replacement logic
- Modular service layer for AI integrations

## Tech Stack
- React + TypeScript (Vite)
- Node.js
- Google Generative AI SDK
- AWS Amplify (Hosting & CI/CD)
- GitHub (Version Control)

## Architecture
- Local development with Vite
- Source control via GitHub
- Continuous deployment using AWS Amplify
- Environment variables managed securely outside source control

## Deployment
The application is deployed on AWS Amplify.
Every commit to the main branch triggers an automatic build and redeploy.

FAQ

How does it work?
It’s a React + TypeScript frontend built with Vite. The UI collects user input and calls a service module that handles AI interactions. The app is version-controlled in GitHub and deployed on AWS Amplify with automatic CI/CD.
Where does the AI call happen?
The AI call happens inside the service layer, not directly in the UI.
I created a dedicated service file that handles communication with the AI API.
The UI calls that service, and the service returns the result back to the frontend.
How is it deployed?
The project is connected to GitHub, and AWS Amplify is linked to the repository.
Amplify pulls the code from the main branch, installs dependencies, builds the app, and hosts the production build.
What happens when I push a commit?
When I push a commit to the main branch on GitHub, AWS Amplify automatically detects the change.
It triggers a build pipeline where dependencies are installed, the app is built, and the new version is deployed.

User → React UI → Service layer → AI API → Response → UI
Code → GitHub → AWS Amplify → Public website

Frontend (React/Vite)
   ↓
Service Layer
   ↓
AI API
   ↓
Deployment via AWS Amplify (CI/CD)

