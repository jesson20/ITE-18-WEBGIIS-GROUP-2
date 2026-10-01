const fs = require('fs/promises');
const path = require('path');
const shapefile = require('shapefile');

const projectRoot = path.resolve(__dirname, '..');
const sourceBase = path.join(
  projectRoot,
  'Mangrove_Philippines_DMA-4326-20231102T063701Z-001',
  'Mangrove_Philippines_DMA-4326',
  'Mangrove_Philippines_DMA-4326',
);
const outputPath = path.join(projectRoot, 'public', 'data', 'mangroves.geojson');

async function convert() {
  const collection = await shapefile.read(`${sourceBase}.shp`, `${sourceBase}.dbf`, {
    encoding: 'utf-8',
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(collection));
  console.log(`Converted ${collection.features.length} mangrove features to ${path.relative(projectRoot, outputPath)}.`);
}

convert().catch((error) => {
  console.error('Could not convert the mangrove shapefile.', error);
  process.exitCode = 1;
});
