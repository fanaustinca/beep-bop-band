// Visual review: render the robot lineup + key screens to tests/screenshots/.
import { serve, launch, openPage } from './harness.mjs';
const srv = await serve();
const BASE = `http://127.0.0.1:${srv.address().port}/`;
const browser = await launch();
const which = process.argv[2] || 'all';
async function snap(url, file, setup, { width = 1400, height = 860, wait = 1500 } = {}) {
  const { page, errors } = await openPage(browser, BASE + url, { width, height });
  if (setup) await page.evaluate(setup);
  await new Promise((r) => setTimeout(r, wait));
  await page.screenshot({ path: 'tests/screenshots/' + file });
  console.log(file, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'ok');
  await page.close();
}
if (which === 'all' || which === 'lineup') {
  for (const [fam, ids] of Object.entries({
    a: 'pip,ivory,tinker,celeste,honky,harpsi,rhoda,marimbo,keytar,vibe,clav',
    b: 'zap,volt,laser,chip,whistle,arp,maestro,nimbus,halo,choir,strings,glass',
    c: 'blare,tuba,slide,horn,sax,strum,harpo,banjo,koto,uke',
    d: 'rumble,subby,acid,wobble,fm,thump,snap,tomtom,boom',
    e: 'tomlow,snare2,tik,shaka,clapper,bell,tamb,conga',
  })) await snap(`?test&lineup=${ids}`, `lineup-${fam}.png`, null, { width: 1600, height: 600 });
  await snap('?test&lineup', 'lineup-all.png', null, { width: 1600, height: 900 });
}
if (which === 'all' || which === 'screens') {
  await snap('?test&fresh', 'title.png');
  await snap('?test&fresh&level=3', 'level3.png');
  await snap('?test&fresh&level=20', 'level20.png');
  await snap('?test&fresh&level=50', 'level50.png');
  await snap('?test&fresh&free', 'free.png');
  await snap('?test&fresh&level=10', 'mobile.png', null, { width: 390, height: 844 });
}
await browser.close(); srv.close();
