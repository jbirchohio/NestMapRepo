import { spawn } from 'child_process';

console.log('Starting database migration...');

const child = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

// Answer prompts automatically
const answers = ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1'];
let answerIndex = 0;

const sendAnswer = () => {
  if (answerIndex < answers.length) {
    child.stdin.write(answers[answerIndex] + '\n');
    answerIndex++;
    setTimeout(sendAnswer, 1500);
  }
};

// Start sending answers after initial delay
setTimeout(sendAnswer, 3000);

child.on('exit', (code) => {
  console.log(`Migration process completed with code ${code}`);
  process.exit(code);
});