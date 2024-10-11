const { exec } = require('child_process');
const os = require('os');
const path = require('path');

console.log('Current working directory:', process.cwd());

function startMySQL() {
  let command;
  if (os.platform() === 'win32') {
    command = 'net start MySQL80'; // Adjust 'MySQL80' to your MySQL service name if different
  } else {
    command = 'sudo service mysql start';
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting MySQL: ${error}`);
      return;
    }
    console.log('MySQL started successfully');
    startNodeApp();
  });
}

function startNodeApp() {
  const serverPath = path.join(__dirname, 'server', 'server.js');
  console.log('Starting server from:', serverPath);
  const serverProcess = exec(`node ${serverPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting Node app: ${error}`);
      return;
    }
    console.log('Node app started successfully');
  });

  serverProcess.stdout.pipe(process.stdout);
  serverProcess.stderr.pipe(process.stderr);

  // Wait a bit before starting the React app to ensure the server is up
  setTimeout(startReactApp, 2000);
}

function startReactApp() {
  console.log('Starting React app...');
  const reactProcess = exec('npm run start', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting React app: ${error}`);
      return;
    }
    console.log('React app started successfully');
  });

  reactProcess.stdout.pipe(process.stdout);
  reactProcess.stderr.pipe(process.stderr);
}

startMySQL();