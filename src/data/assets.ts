/**
 * =========================================================================================
 * 🎨 HUKUM IDENTITAS • MASTER ASSET REGISTRY
 * =========================================================================================
 */

// 1. IMAGE ASSETS
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

// 2. CUSTOM AUDIO ASSETS
// Jika ditaruh di folder public/sounds/Something.mp3, tulis: './sounds/Something.mp3'
// Jika file sudah ada di src/assets/sounds/Something.mp3, Anda juga bisa memakai import.
export const AUDIO_ASSETS = {
  masterBgm: './sounds/Something.mp3',

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
