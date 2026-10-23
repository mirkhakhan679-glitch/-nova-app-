import test from 'node:test';
import assert from 'node:assert/strict';
import { isRTL, getTextDirection, detectIntent } from './language.ts';
import { formatCallDuration, AVAILABLE_VOICES } from './audio.ts';

test('isRTL detects Urdu and Arabic text accurately', () => {
  assert.equal(isRTL('السلام علیکم! آپ کیسے ہیں؟'), true);
  assert.equal(isRTL('Hello, how can I help you today?'), false);
  assert.equal(isRTL('ایک خوبصورت منظر کی تصویر بناؤ'), true);
  assert.equal(isRTL('Nova is awesome'), false);
});

test('getTextDirection returns rtl for Urdu and ltr for English', () => {
  assert.equal(getTextDirection('اردو زبان'), 'rtl');
  assert.equal(getTextDirection('English language'), 'ltr');
});

test('detectIntent categorizes image requests in both Urdu and English', () => {
  const urduImage = detectIntent('ایک گلاب کی تصویر بنائیں');
  assert.equal(urduImage.type, 'image');
  assert.equal(urduImage.isUrdu, true);

  const engImage = detectIntent('Generate a picture of a cosmic sunset over mountains');
  assert.equal(engImage.type, 'image');
  assert.equal(engImage.isUrdu, false);

  const urduVideo = detectIntent('سمندر کی لہروں کی ایک ویڈیو بنائیں');
  assert.equal(urduVideo.type, 'video');

  const engVideo = detectIntent('Create a video of an eagle soaring in the sky');
  assert.equal(engVideo.type, 'video');

  const regularText = detectIntent('پاکستان کا دارالحکومت کیا ہے؟');
  assert.equal(regularText.type, 'text');
});

test('formatCallDuration formats seconds into mm:ss strings', () => {
  assert.equal(formatCallDuration(0), '00:00');
  assert.equal(formatCallDuration(9), '00:09');
  assert.equal(formatCallDuration(65), '01:05');
  assert.equal(formatCallDuration(600), '10:00');
});

test('AVAILABLE_VOICES includes male and female voices with preview text', () => {
  assert.ok(AVAILABLE_VOICES.length >= 4);
  const femaleVoice = AVAILABLE_VOICES.find(v => v.gender === 'Female');
  const maleVoice = AVAILABLE_VOICES.find(v => v.gender === 'Male');
  assert.ok(femaleVoice);
  assert.ok(maleVoice);
});
