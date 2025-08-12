const { spawn } = require('child_process');

const child = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

// Send "1" to select the first option (create table)
setTimeout(() => {
  child.stdin.write('1\n');
  
  // Handle any additional prompts
  setTimeout(() => {
    child.stdin.write('1\n');
    setTimeout(() => {
      child.stdin.write('1\n');
      setTimeout(() => {
        child.stdin.write('1\n');
        setTimeout(() => {
          child.stdin.write('1\n');
          setTimeout(() => {
            child.stdin.write('1\n');
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }, 1000);
}, 2000);

child.on('exit', (code) => {
  console.log(`Process exited with code ${code}`);
});