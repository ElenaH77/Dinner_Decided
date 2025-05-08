// This is a temporary file to make specific changes to openai.ts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'server/openai.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace all meal plan generation temperatures with 0.4
content = content.replace(/temperature: 0\.7,/g, 'temperature: 0.4,');

// 2. Replace the meal modification temperature with 0.3
content = content.replace(/temperature: 0\.5,/g, 'temperature: 0.3,');

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('OpenAI temperature settings updated successfully!');