"use client";

import { useEffect, useState } from "react";
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
export default function Home() {
  // state
  let algoName = "AES-GCM";
  let [operations, setOperations] = useState(null);
  let [iv, setIv] = useState(null);
  let [testKey, setTestKey] = useState("12345678");

  // filter Object
  const acceptedTypes = {
    "text/plain": true,
    "application/pdf": true,
    "image/jpeg": true,
    "image/png": true,
    size: 15000000,
  };

  const zip = new JSZip();

  // setCrypto:
  useEffect(() => {
    const operations = window.crypto.subtle || window.crypto.webkitSubtle;
    (async () => {
      let hashObj = await argon2.hash({
        pass: "password",
        salt: "somesalt",
        time: 3,
        mem: 65536,
        hashLen: 32,
        parallelism: 1,
        type: argon2.ArgonType.Argon2id,
      });
      let hashStr = hashObj.hashHex;
      console.log(hashStr);
      return hashStr;
    })();

    // if Web Crypto or SubtleCrypto is not supported, notify the user
    if (!operations) {
      alert("Web Crypto is not supported on this browser");
      console.warn("Web Crypto API not supported");
    } else {
      let encoder = new TextEncoder();
      let strEnc = encoder.encode("userGeneratedKey");

      let fakeKey = window.crypto.subtle.importKey(
        "raw",
        strEnc,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
      );

      fakeKey.then((res) => {
        setTestKey(res);
      });

      setIv(strEnc);
      setOperations(operations);
    }
  }, []);

  // helper functions:
  let compressFile = async (uploadedFile) => {
    try {
      // sanitize file contents: striping invalid chars from file before upload.
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

  // input handler
  const onFileInput = async (e) => {
    const uploadedFile = e.target.files[0];
    const type = uploadedFile.type;
    const isTooBig = uploadedFile.size > acceptedTypes.size;
    console.log("size: ", uploadedFile.size > acceptedTypes.size);
    console.log("type: ", type);
    const isAllowed = acceptedTypes[type];
    if (isAllowed && !isTooBig) {
      let name = uploadedFile.name.split(".")[0];
      let isClean = true;
      if (type === "text/plain") {
        isClean = cleanFile(uploadedFile);
      }

      if (operations && testKey && iv && isClean) {
        console.log("compressing uploaded file");
        const zipFile = await compressFile(uploadedFile);
        console.log(zipFile);
        console.log("Encrypting uploaded file");
        const encFile = await encryptFile(zipFile, testKey);
        console.log(encFile);
        console.log("decrypting uploaded file");
        const decFile = await decryptFile(encFile, testKey);
        console.log(decFile);
        if (decFile && encFile) {
          downloadFile(decFile, name, "zip");
          downloadFile(encFile, name, "enc");
        }
      }
    }
  };

  // input jsx
  return (
    <div>
      <input type="file" id="file-selector" multiple onChange={onFileInput} />
    </div>
  );
}

// console.log(dec);
