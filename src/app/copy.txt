"use client";

import { useState } from "react";
import JSZip from "jszip";
import CryptoJS from "crypto-js";

export default function Home() {
  let [file, setFile] = useState(null);
  let [zipFile, setZipFile] = useState(null);
  let [encFile, setEncFile] = useState(null);

  const zip = new JSZip();

  const acceptedTypes = {
    "text/plain": true,
    "application/pdf": true,
    "image/jpeg": true,
  };
  let testKey = "12345678";

  let downloadFile = (file, ext) => {
    let elem = window.document.createElement("a");
    elem.href = window.URL.createObjectURL(file);
    elem.download = `file.${ext}`;
    elem.click();
  };

  function convertWordArrayToUint8Array(wordArray) {
    var arrayOfWords = wordArray.hasOwnProperty("words") ? wordArray.words : [];
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

  let compressFile = async (uploadedFile) => {
    zip.file(uploadedFile.name, uploadedFile);

    const blobData = await zip.generateAsync({ type: "blob" });
    let zipBlob = new Blob([blobData]);

    // encrypt
    let reader = new FileReader();
    let fileEnc;
    reader.onload = () => {
      console.log("reader on");
      let wordArray = CryptoJS.lib.WordArray.create(reader.result);

      let encrypted = CryptoJS.AES.encrypt(wordArray, testKey);

      fileEnc = new Blob([encrypted]);
      downloadFile(fileEnc, "enc");

      // decrypt
      let decReader = new FileReader();
      decReader.onload = () => {
        console.log("dec reader on");
        let decrypted = CryptoJS.AES.decrypt(encrypted, testKey);

        let typedArr = convertWordArrayToUint8Array(decrypted);

        let fileDec = new Blob([typedArr]);
        downloadFile(fileDec, "zip");
      };
      decReader.readAsText(fileEnc);
    };

    reader.readAsArrayBuffer(zipBlob);
    return fileEnc;
  };

  const onFileInput = async (e) => {
    const uploadedFile = e.target.files[0];
    const type = uploadedFile.type;
    const isAllowed = acceptedTypes[type];
    if (isAllowed) {
      setFile(uploadedFile);
      let compressed = await compressFile(uploadedFile);
    }
  };

  return (
    <div>
      <input type="file" id="file-selector" multiple onChange={onFileInput} />
    </div>
  );
}

// console.log(dec);
