"use client";

import { useEffect, useState } from "react";
import JSZip from "jszip";
import CryptoJS from "crypto-js";

let downloadFile = (file, fileName, ext) => {
  let elem = window.document.createElement("a");
  elem.href = window.URL.createObjectURL(file);
  elem.download = `${fileName}.${ext}`;
  elem.click();
};

export default function Home() {
  // state
  let [file, setFile] = useState(null);
  let [fileName, setFileName] = useState("file");
  let [testKey, setTestKey] = useState("12345678");
  let [zipFile, setZipFile] = useState(null);
  let [encFile, setEncFile] = useState(null);
  let [decFile, setDecFile] = useState(null);

  // filter Object
  const acceptedTypes = {
    "text/plain": true,
    "application/pdf": true,
    "image/jpeg": true,
    "image/png": true,
    size: 1500000,
  };

  const zip = new JSZip();

  // helper functions:
  let compressFile = async (uploadedFile) => {
    zip.file(uploadedFile.name, uploadedFile);
    const blobData = await zip.generateAsync({ type: "blob" });
    setZipFile(blobData);
  };

  const encryptFile = (zipBlob, testKey) => {
    // encrypt
    let reader = new FileReader();

    reader.onload = () => {
      let wordArray = CryptoJS.lib.WordArray.create(reader.result);
      let encrypted = CryptoJS.AES.encrypt(wordArray, testKey);

      setEncFile(encrypted);
    };

    reader.readAsArrayBuffer(zipBlob);
  };

  const decryptFile = (encrypted, testKey) => {
    // convert wordArray to 8bit array
    function convertWordArrayToUint8Array(wordArray) {
      var arrayOfWords = wordArray.hasOwnProperty("words")
        ? wordArray.words
        : [];
      var length = wordArray.hasOwnProperty("sigBytes")
        ? wordArray.sigBytes
        : arrayOfWords.length * 4;
      var uInt8Array = new Uint8Array(length),
        index = 0,
        word,
        i;
      for (i = 0; i < length; i++) {
        word = arrayOfWords[i];
        uInt8Array[index++] = word >> 24;
        uInt8Array[index++] = (word >> 16) & 0xff;
        uInt8Array[index++] = (word >> 8) & 0xff;
        uInt8Array[index++] = word & 0xff;
      }
      return uInt8Array;
    }

    let decReader = new FileReader();
    decReader.onload = () => {
      let decrypted = CryptoJS.AES.decrypt(encrypted, testKey);
      let typedArr = convertWordArrayToUint8Array(decrypted);

      setDecFile(typedArr);
    };
    decReader.readAsText(new Blob([encrypted]));
  };

  // compress file
  useEffect(() => {
    (async () => {
      if (file) {
        console.log("compressing file...");
        await compressFile(file);
      }
    })();
  }, [file]);

  // encryptFile
  useEffect(() => {
    (async () => {
      if (zipFile) {
        console.log("encrypting file...");
        await encryptFile(zipFile, testKey);
      }
    })();
  }, [zipFile]);

  // decrypt file
  useEffect(() => {
    (async () => {
      if (encFile) {
        console.log("decrypting file...");
        await decryptFile(encFile, testKey);
      }
    })();
  }, [encFile]);

  useEffect(() => {
    (async () => {
      if (decFile) {
        console.log("downloading file");
        downloadFile(new Blob([encFile]), fileName, "enc");
        downloadFile(new Blob([decFile]), fileName, "zip");
      }
    })();
  }, [decFile]);

  // input handler
  const onFileInput = async (e) => {
    const uploadedFile = e.target.files[0];
    const type = uploadedFile.type;
    const isTooBig = uploadedFile.size > acceptedTypes.size;
    console.log("size: ", uploadedFile.size);
    console.log("type: ", type);
    const isAllowed = acceptedTypes[type];
    if (isAllowed && !isTooBig) {
      let name = uploadedFile.name.split(".")[0];

      setFile(uploadedFile);
      setFileName(name);
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
