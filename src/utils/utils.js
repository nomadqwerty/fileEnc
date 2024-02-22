import JSZip from "jszip";
import xss from "xss";
import argon2 from "argon2-browser";

let downloadFile = (file, fileName, ext) => {
  file = new Blob([file]);
  let elem = window.document.createElement("a");
  elem.href = window.URL.createObjectURL(file);
  elem.download = `${fileName}.${ext}`;
  console.log("here");
  elem.click();
};

const cleanFile = async (uploadedFile) => {
  const fileText = await uploadedFile.text();
  const cleanText = xss(fileText);
  let isClean = fileText.includes(cleanText);
  return isClean;
};

let compressFile = async (uploadedFile) => {
  try {
    // sanitize file contents: striping invalid chars from file before upload.
    const zip = new JSZip();
    let fileType = uploadedFile.type;

    if (fileType === "text/plain") {
      const fileText = await uploadedFile.text();
      const cleanText = xss(fileText);

      console.log(cleanText);
    }

    zip.file(uploadedFile.name, uploadedFile);
    const arrayBufferData = await zip.generateAsync({ type: "arraybuffer" });
    return arrayBufferData;
  } catch (error) {
    console.log(error.message, ":- compression error");
  }
};

const encryptFile = async (zipFile, testKey) => {
  try {
    const encrypted = await operations.encrypt(
      { name: algoName, iv },
      testKey,
      zipFile
    );
    return encrypted;
  } catch (error) {
    console.log(error.message, ":- encryption error");
  }
};

const decryptFile = async (encrypted, testKey) => {
  const decryptedData = await operations.decrypt(
    {
      name: algoName,
      iv,
    },
    testKey,
    encrypted
  );

  return decryptedData;
};

const psyMaxKDF = async (password, salt) => {
  const hashObj = await argon2.hash({
    pass: password,
    salt: salt,
    time: 3,
    mem: 65536,
    hashLen: 32,
    parallelism: 1,
    type: argon2.ArgonType.Argon2id,
  });
  const hashStr = hashObj.hashHex;
  return hashStr;
};

const passwordGenerator = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*?_+";
  let result = "";

  for (let i = 0; i < 24; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
};

export {
  downloadFile,
  cleanFile,
  compressFile,
  encryptFile,
  decryptFile,
  psyMaxKDF,
  passwordGenerator,
};
