/* 
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  
  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  
      http://www.apache.org/licenses/LICENSE-2.0
  
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';

const dir = path.join(process.cwd(), '..', 'blueprint-infrastructure-asset');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

const output = fs.createWriteStream(
    path.join(
        process.cwd(),
        '..',
        'blueprint-infrastructure-asset',
        'blueprint-infrastructure.zip'
    )
);

const archive = archiver('zip');

output.on('close', function () {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function (err) {
    throw err;
});

archive.pipe(output);

archive.glob('**/*', {
    cwd: process.cwd(),
    ignore: ['node_modules/**', 'cdk.out/**', 'dist/**', '*context.json'],
});

archive.finalize();
