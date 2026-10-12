// Visual review of the dance routines: freeze a lineup at several beats of the 2-bar routine.
//   node tests/dances.mjs [ids]   → tests/screenshots/dance-<beat>.png
import { serve, launch, openPage } from './harness.mjs';
const srv = await serve();
const browser = await launch();
const ids = process.argv[2] || 'pip,thump,zap,rhoda,nimbus,blare,strum,shaka,volt,tuba,laser,acid,tamb,maestro';
const { page, errors } = await openPage(browser, `http://127.0.0.1:${srv.address().port}/?test&lineup=${ids}`, { width: 1700, height: 620 });
await page.waitForFunction(() => window.RO && window.RO.ready);
for (const b of [0.0, 0.9, 2.0, 3.0, 5.5, 6.5, 7.0]) {
  await page.evaluate((b) => {
    const st = RO.stage; st.manual = true; st.playing = true;
    st.groove = { b: 0, beatDur: 0.5, bpb: 4 };
    for (let i = 0; i < 60; i++) { for (const e of st.robots.values()) e.bot.hit(0.5, 0.5, 0.25); st.update(1 / 60); }
    st.groove.b = b; st.update(0.0001); st.render();
  }, b);
  await page.screenshot({ path: `tests/screenshots/dance-${b}.png` });
}
console.log('done', errors);
await browser.close(); srv.close();
