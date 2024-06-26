"use client";

import styles from "./fileupload.module.css";
import { useEffect, useState } from "react";
import JSZip from "jszip";
import xss from "xss";
import argon2 from "argon2-browser";

let downloadFile = (file, fileName, ext) => {
  console.log(file);
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
  let [mediaChunks, setMediaChunks] = useState([]);
  let [recorder, setRecorder] = useState(null);
  let [stream, setStream] = useState(null);
  let chunksStream = [];

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
        const uint = new Uint8Array(encFile);
        const arrayBuf = Array.from(uint);

        console.log(uint.buffer);
        console.log(encFile);
        console.log(uint);
        console.log(arrayBuf);
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

  const onVoiceRecord = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        if (!recorder) {
          let audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          setRecorder(new MediaRecorder(audioStream));
          setStream(audioStream);
        } else {
          recorder.stop();
        }
      }
    } catch (error) {}
  };
  const onRemoveRecord = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
        const playBack = document.querySelector("#audioTracks");
        playBack.src = null;
        setRecorder(null);
      }
    } catch (error) {}
  };

  useEffect(() => {
    if (recorder) {
      recorder.ondataavailable = (e) => {
        chunksStream.push(e.data);
      };

      recorder.onstop = (e) => {
        setMediaChunks(chunksStream);
        chunksStream = [];
      };
      recorder.start();
    }
  }, [recorder]);
  useEffect(() => {
    if (mediaChunks.length > 0) {
      const playBack = document.querySelector("#audioTracks");
      const blob = new Blob(mediaChunks, { type: "audio/ogg; codecs=opus" });
      setMediaChunks([]);
      console.log(blob);

      const audioUrl = window.URL.createObjectURL(blob);
      playBack.src = audioUrl;
    }
  }, [mediaChunks]);
  // input jsx
  return (
    <div>
      <input type="file" id="file-selector" multiple onChange={onFileInput} />
      <div className={styles.voiceRecordWrap}>
        <button
          className={styles.voiceRecordBtn}
          id="mic"
          onClick={onVoiceRecord}
        >
          <span>mic</span>
        </button>

        <audio controls id="audioTracks"></audio>
        <button
          className={styles.voiceRecordBtn}
          id="delete"
          onClick={onRemoveRecord}
        >
          <span>delete</span>
        </button>
      </div>
    </div>
  );
}

// console.log(dec);
