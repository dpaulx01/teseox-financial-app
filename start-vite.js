import { createServer } from 'vite';

async function startServer() {
  try {
    console.log('Starting Vite server...');
    const server = await createServer({
      server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: false
      }
    });
    
    await server.listen();
    console.log('Vite server started successfully!');
    server.printUrls();
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

startServer();