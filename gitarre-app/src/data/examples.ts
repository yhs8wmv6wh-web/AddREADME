import type { Song } from '../types'

type Example = Omit<Song, 'id' | 'createdAt' | 'updatedAt' | 'example'>

// Nur gemeinfreie Traditionals und eigene Übungen – eigene Lieblingssongs
// fügst du selbst ein (z. B. von Ultimate Guitar kopieren).
export const EXAMPLE_SONGS: Example[] = [
  {
    title: 'House of the Rising Sun',
    artist: 'Traditional',
    transpose: 0,
    capo: 0,
    bpm: 80,
    notes: '6/8-Takt. Pro Akkord einmal zupfen wie im Intro-Tab (Bass, dann G-H-e-H-G).',
    text: `[Intro]
Am         C            D            F
e|-------0----|-------0----|-------2----|-------1----|
B|-----1---1--|-----1---1--|-----3---3--|-----1---1--|
G|---2-------2|---0-------0|---2-------2|---2-------2|
D|------------|------------|-0----------|------------|
A|-0----------|-3----------|------------|------------|
E|------------|------------|------------|-1----------|

Am         C            E            E
e|-------0----|-------0----|-------0----|-------0----|
B|-----1---1--|-----1---1--|-----0---0--|-----0---0--|
G|---2-------2|---0-------0|---1-------1|---1-------1|
D|------------|------------|------------|------------|
A|-0----------|-3----------|------------|------------|
E|------------|------------|-0----------|-0----------|

[Strophe 1]
      Am       C        D          F
There is a house in New Orleans
     Am       C        E
They call the Rising Sun
         Am       C        D          F
And it's been the ruin of many a poor boy
       Am       E        Am    E
And God, I know I'm one`,
  },
  {
    title: 'Amazing Grace',
    artist: 'Traditional (John Newton, 1779)',
    transpose: 0,
    capo: 0,
    bpm: 90,
    notes: '3/4-Takt. Schlagmuster: Ab – Ab – Ab (ein Abschlag pro Zählzeit).',
    text: `[Strophe 1]
G               G7         C      G
Amazing grace, how sweet the sound
                        D
That saved a wretch like me
G              G7         C       G
I once was lost, but now am found
           D            G
Was blind, but now I see`,
  },
  {
    title: 'Übung: Em – G – D – C',
    artist: 'Eigene Übung',
    transpose: 0,
    capo: 0,
    bpm: 70,
    notes:
      'Die Akkordfolge steckt in unzähligen Pop-Songs. Schlagmuster: Ab – Ab – Auf – Auf – Ab – Auf. Erst langsam, jeder Akkord 4 Schläge.',
    text: `{title: Übung: Em – G – D – C}
{comment: Akkordfolge (ChordPro-Format)}
[Em]Eins, zwei, drei, vier, [G]eins, zwei, drei, vier
[D]Eins, zwei, drei, vier, [C]eins, zwei, drei, vier

[Riff in E-Moll-Pentatonik]
e|------------|---------0-3|
B|------------|-----0-3----|
G|------------|-0-2--------|
D|---------0-2|------------|
A|-----0-2----|------------|
E|-0-3--------|------------|`,
  },
]
