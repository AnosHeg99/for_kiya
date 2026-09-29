/**
 * =========================================================================================
 * 🎨 HUKUM IDENTITAS
 * =========================================================================================
 * SATU-SATUNYA TEMPAT untuk mengganti asset visual dan audio kustom.
 *
 * Cara pakai:
 * 1. Ganti file di folder `src/assets/images/` / tambahkan file baru.
 * 2. Ubah import atau nilai pada bagian yang sesuai di file ini saja.
 * 3. Jangan ubah nama key jika ingin seluruh scene tetap bekerja tanpa perubahan kode lain.
 *
 * Catatan:
 * - Seluruh export di file ini sengaja memakai nama semantik agar komponen tidak perlu
 *   mengetahui nama file asset yang sebenarnya.
 * - Nilai audio kosong (`''`) mempertahankan perilaku procedural audio bawaan.
 * =========================================================================================
 */

// =========================================================================================
// 1. IMAGE ASSETS
// =========================================================================================
import identitas from '../assets/images/1.png';
import goldenHourAnimeGirl from '../assets/images/sword.png';
import goldenHourSky from '../assets/images/wistoria.jpg';
import goldenWaxSealedLetter from '../assets/images/LawOfIdentityDKDAct5.png';
import destruction from '../assets/images/2.jpg';
import kiyameongkawaii from '../assets/images/3.png';
import rimuru from '../assets/images/4.png';
import magicalSkyGiftBox from '../assets/images/magical_sky_gift_box_1788940999827.jpg';
import memoryCardSceneTrain from '../assets/images/memory_card_scene_train_1788941039108.jpg';
import memoryCardSceneWindow from '../assets/images/memory_card_scene_window_1788941058411.jpg';
import softSkyblueAnimeSky from '../assets/images/wistoria.jpg';

export const IMAGE_ASSETS = {
  identitas,
  goldenHourAnimeGirl,
  goldenHourSky,
  goldenWaxSealedLetter,
  destruction,
  kiyameongkawaii,
  rimuru,
  magicalSkyGiftBox,
  memoryCardSceneTrain,
  memoryCardSceneWindow,
  softSkyblueAnimeSky,
} as const;

// =========================================================================================
// 2. CUSTOM AUDIO ASSETS
// =========================================================================================
// Isi string dengan path lokal atau URL audio untuk menggantikan procedural audio.
// Kosong = tetap menggunakan acoustic/procedural engine bawaan.
export const AUDIO_ASSETS = {
  masterBgm: '/sounds/Something.mp3',

  hoshineko: {
    greeting: '',
    happy: '',
    purring: '',
    chirp: '',
    giftReaction: '',
    sleepy: '',
  },

  sceneClick: {
    opening: '',
    sanctuary: '',
    letter: '',
    gift: '',
    reply: '',
    arigatou: '',
  },

  specialSfx: {
    giftOpenMagical: '',
    replySendAscension: '',
    waxSealBreak: '',
    seasonalShift: '',
  },
} as const;
