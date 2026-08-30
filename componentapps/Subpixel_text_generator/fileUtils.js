import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const importImage = (file, dispatch) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    dispatch({ type: 'SET_IMAGE', payload: { image: img, name: file.name } });
    URL.revokeObjectURL(url);
  };
  img.src = url;
};

export const exportImage = (image, layers) => {
  if (!image) return;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  // Здесь можно нарисовать выделения, если нужно экспортировать с ними
  // ...
  canvas.toBlob((blob) => {
    saveAs(blob, 'exported.png');
  });
};

export const saveProject = async (state) => {
  if (!state.image) return;
  const zip = new JSZip();
  // Добавляем изображение
  const imgBlob = await new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = state.image.width;
    canvas.height = state.image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.image, 0, 0);
    canvas.toBlob(resolve, 'image/png');
  });
  zip.file('image.png', imgBlob);
  // Добавляем JSON с параметрами
  zip.file('project.json', JSON.stringify({ layers: state.layers, activeLayerId: state.activeLayerId, showAllLayers: state.showAllLayers }));
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'project.stg');
};

export const openProject = async (dispatch) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.stg';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const zip = await JSZip.loadAsync(file);
    const imageFile = zip.file('image.png');
    const projectFile = zip.file('project.json');
    if (!imageFile || !projectFile) return;
    const imageBlob = await imageFile.async('blob');
    const projectData = JSON.parse(await projectFile.async('text'));
    const img = new Image();
    img.onload = () => {
      dispatch({ type: 'LOAD_PROJECT', payload: { image: img, ...projectData } });
    };
    img.src = URL.createObjectURL(imageBlob);
  };
  input.click();
};