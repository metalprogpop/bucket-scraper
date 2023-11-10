const { S3Client, ListObjectsCommand } = require("@aws-sdk/client-s3");
const { fromIni } = require("@aws-sdk/credential-provider-node");
const fs = require('fs');
const { Command } = require('commander');
require('dotenv').config();

const program = new Command();

program
  .option('--verbose', 'Enable verbose output')
  .parse(process.argv);

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const blobNamePrefix = process.env.S3_BLOB_NAME_PREFIX;
const bucketName = process.env.S3_BUCKET_NAME;
const folderName = process.env.S3_FOLDER_NAME;
const outputFileName = process.env.OUTPUT_FILE_NAME;

async function listPublicBlobURLs() {
  try {
    // List objects in the S3 bucket under the specified folder
    const listParams = {
      Bucket: bucketName,
      Prefix: `${folderName}/`, // Specify the folder as a prefix
    };

    const data = await s3Client.send(new ListObjectsCommand(listParams));

    const publicBlobURLs = data.Contents
      .filter(obj => obj.Key.includes(`${blobNamePrefix}`))
      .map(obj => {
        const fileName = obj.Key.split('/').pop(); // Extract the file name
        const visibleText = fileName.replace(/\.[^/.]+$/, '').replace(/-/g, ' - ');
        return `[${visibleText}](https://${bucketName}.s3.amazonaws.com/${encodeURIComponent(obj.Key)})`;
      });

    return publicBlobURLs;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async function writeBlobURLsToFile(blobURLs) {
  try {
    fs.writeFileSync(outputFileName, blobURLs.join('\n'));
    console.log(`Markdown-formatted links for blobs with '${blobNamePrefix}' in their names have been written to ${outputFileName}`);
  } catch (error) {
    console.error('Error writing to the file:', error);
  }
}

async function main() {
  try {
    const publicBlobURLs = await listPublicBlobURLs();
    if (program.verbose) {
      console.log(`Markdown-formatted links for blobs with '${blobNamePrefix}' in their names:`);
      publicBlobURLs.forEach(url => console.log(url));
    }

    await writeBlobURLsToFile(publicBlobURLs);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
