const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputFilePath = 'bad_apple.mp4';
const outputDir = 'frames';
const jsonOutputPath = 'frames.json';
const newWidth = 67; // Largeur souhaitée pour le redimensionnement
const newHeight = 50; // Hauteur souhaitée pour le redimensionnement

// Assurez-vous que le répertoire de sortie existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Fonction pour extraire les frames d'une vidéo
const extractFrames = (input, output) => {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .on('end', resolve)
      .on('error', reject)
      .save(`${output}/frame%d.png`);
  });
};

// Fonction pour convertir une image en une matrice 2D de niveaux de gris redimensionnée
const imageToGrayScaleArray = async (imagePath, width, height) => {
  const buffer = await sharp(imagePath)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer();

  return Array.from(buffer);
};

// Fonction pour appliquer l'encodage par longueur de course (Run-Length Encoding, RLE) sur un tableau 1D
const runLengthEncode = (array) => {
  const encoded = [];
  let currentValue = array[0];
  let currentLength = 1;

  for (let i = 1; i < array.length; i++) {
    if (array[i] === currentValue && currentLength < 255) {
      currentLength++;
    } else {
      encoded.push(currentValue, currentLength);
      currentValue = array[i];
      currentLength = 1;
    }
  }

  encoded.push(currentValue, currentLength);
  return encoded;
};

// Fonction principale pour extraire les frames, les redimensionner, les convertir en niveaux de gris et les encoder en RLE
const processVideo = async (inputFilePath, outputDir, jsonOutputPath, newWidth, newHeight) => {
  try {
    // Extraire les frames de la vidéo
    await extractFrames(inputFilePath, outputDir);

    // Lire et convertir chaque frame en une matrice 2D de niveaux de gris redimensionnée
    const files = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0]);
        const numB = parseInt(b.match(/\d+/)[0]);
        return numA - numB;
      });
    const frames = [];

    for (const file of files) {
      const framePath = path.join(outputDir, file);
      const grayScaleArray = await imageToGrayScaleArray(framePath, newWidth, newHeight);
      const encodedArray = runLengthEncode(grayScaleArray);
      frames.push(encodedArray);
      console.log(`Frame ${files.indexOf(file) + 1} / ${files.length} traitée`);
    }

    // Écrire le résultat en JSON
    fs.writeFileSync(jsonOutputPath, JSON.stringify(frames));
    console.log(`Conversion terminée. Le fichier JSON est enregistré à ${jsonOutputPath}`);
  } catch (error) {
    console.error('Une erreur est survenue :', error);
  }
};

processVideo(inputFilePath, outputDir, jsonOutputPath, newWidth, newHeight);