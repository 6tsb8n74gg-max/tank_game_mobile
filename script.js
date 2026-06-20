const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const waveText = document.querySelector('#waveText');
const nameText = document.querySelector('#nameText');
const hpText = document.querySelector('#hpText');
const shellText = document.querySelector('#shellText');
const powerText = document.querySelector('#powerText');
const restartButton = document.querySelector('#restartButton');
const startButton = document.querySelector('#startButton');
const gameOverRestartButton = document.querySelector('#gameOverRestartButton');
const clearRankingButton = document.querySelector('#clearRankingButton');
const playerNameInput = document.querySelector('#playerNameInput');
const startOverlay = document.querySelector('#startOverlay');
const upgradeOverlay = document.querySelector('#upgradeOverlay');
const gameOverOverlay = document.querySelector('#gameOverOverlay');
const upgradeList = document.querySelector('#upgradeList');
const rankingList = document.querySelector('#rankingList');
const gameOverRankingList = document.querySelector('#gameOverRankingList');
const resultTitle = document.querySelector('#resultTitle');
const resultText = document.querySelector('#resultText');
const keys = Object.create(null);
const mouse = { x: 0, y: 0, down: false };
const RANKING_KEY = 'tankSurvivalRanking';
let player, playerBullets, enemyBullets, enemies, particles, wave, enemiesToSpawn, spawnTimer, fireTimer, gameState;
let playerName = 'Player';
let scoreSaved = false;
let lastTime = 0;

function focusGame() { canvas.focus({ preventScroll: true }); document.body.focus({ preventScroll: true }); }
function resizeCanvas() { canvas.width = Math.floor(window.innerWidth * devicePixelRatio); canvas.height = Math.floor(window.innerHeight * devicePixelRatio); ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
function vw(){return window.innerWidth} function vh(){return window.innerHeight}
function getRankings(){try{return JSON.parse(localStorage.getItem(RANKING_KEY))||[]}catch{return[]}}
function saveRankings(r){localStorage.setItem(RANKING_KEY,JSON.stringify(r))}
function addRanking(name,reachedWave){const r=getRankings();r.push({name,wave:reachedWave,date:new Date().toLocaleDateString('ko-KR')});r.sort((a,b)=>b.wave-a.wave);saveRankings(r.slice(0,10));renderRanking()}
function escapeHTML(t){return String(t).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function renderRanking(){const r=getRankings();const html=r.length? r.map(x=>`<li><span>${escapeHTML(x.name)}</span><strong>Wave ${x.wave}</strong></li>`).join(''):'<li class="empty-rank">아직 기록이 없습니다.</li>'; rankingList.innerHTML=html; gameOverRankingList.innerHTML=html}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))} function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}

function resetGame(){playerName=playerNameInput.value.trim()||'Player';scoreSaved=false;player={x:vw()/2,y:vh()/2,radius:22,speed:250,hp:100,maxHp:100,shellCount:1,power:1,reload:.22};playerBullets=[];enemyBullets=[];enemies=[];particles=[];wave=1;spawnTimer=0;fireTimer=0;gameState='playing';startOverlay.classList.add('hidden');upgradeOverlay.classList.add('hidden');gameOverOverlay.classList.add('hidden');focusGame();startWave()}
function startWave(){enemies=[];enemyBullets=[];enemiesToSpawn=5+wave*3;spawnTimer=0;gameState='playing';updateHud()}
function updateHud(){waveText.textContent=wave;nameText.textContent=playerName;hpText.textContent=`${Math.max(0,Math.ceil(player.hp))} / ${player.maxHp}`;shellText.textContent=player.shellCount;powerText.textContent=player.power}
function spawnEnemy(){const edge=Math.floor(Math.random()*4);let x=0,y=0;if(edge===0){x=Math.random()*vw();y=-40}else if(edge===1){x=vw()+40;y=Math.random()*vh()}else if(edge===2){x=Math.random()*vw();y=vh()+40}else{x=-40;y=Math.random()*vh()}enemies.push({x,y,radius:20,hp:2+Math.floor(wave*.5),speed:60+wave*8,shootCooldown:.8+Math.random()*1.4,type:Math.random()>.5?'triangle':'square'})}
function shootPlayerBullet(){let angle=Math.atan2(mouse.y-player.y,mouse.x-player.x); if(!Number.isFinite(angle)) angle=-Math.PI/2; const spread=.12;for(let i=0;i<player.shellCount;i++){const o=(i-(player.shellCount-1)/2)*spread;playerBullets.push({x:player.x+Math.cos(angle+o)*28,y:player.y+Math.sin(angle+o)*28,vx:Math.cos(angle+o)*620,vy:Math.sin(angle+o)*620,radius:6,damage:player.power,life:1.4})}}
function shootEnemyBullet(e){const a=Math.atan2(player.y-e.y,player.x-e.x), speed=150+wave*12;enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,radius:8,damage:8+wave,life:6})}
function addParticles(x,y,c){for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*120;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,radius:2+Math.random()*3,color:c,life:.45})}}
function updatePlayer(dt){let dx=0,dy=0;if(keys.arrowup||keys.w)dy--;if(keys.arrowdown||keys.s)dy++;if(keys.arrowleft||keys.a)dx--;if(keys.arrowright||keys.d)dx++;if(dx||dy){const l=Math.hypot(dx,dy);player.x+=(dx/l)*player.speed*dt;player.y+=(dy/l)*player.speed*dt}player.x=clamp(player.x,player.radius,vw()-player.radius);player.y=clamp(player.y,player.radius,vh()-player.radius);fireTimer-=dt;if(mouse.down&&fireTimer<=0){shootPlayerBullet();fireTimer=player.reload}}
function updateEnemies(dt){spawnTimer-=dt;if(enemiesToSpawn>0&&spawnTimer<=0){spawnEnemy();enemiesToSpawn--;spawnTimer=Math.max(.18,1-wave*.035)}enemies.forEach(e=>{const a=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;e.shootCooldown-=dt;if(e.shootCooldown<=0){shootEnemyBullet(e);e.shootCooldown=Math.max(.3,1.7-wave*.06)}if(dist(e,player)<e.radius+player.radius)player.hp-=18*dt})}
function updateBullets(dt){playerBullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt});enemyBullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(dist(b,player)<b.radius+player.radius){player.hp-=b.damage;b.life=0;addParticles(player.x,player.y,'#ef4444')}});playerBullets.forEach(b=>enemies.forEach(e=>{if(b.life>0&&e.hp>0&&dist(b,e)<b.radius+e.radius){e.hp-=b.damage;b.life=0;addParticles(e.x,e.y,'#f59e0b')}}));enemies=enemies.filter(e=>e.hp>0);playerBullets=playerBullets.filter(b=>b.life>0&&b.x>-60&&b.x<vw()+60&&b.y>-60&&b.y<vh()+60);enemyBullets=enemyBullets.filter(b=>b.life>0&&b.x>-80&&b.x<vw()+80&&b.y>-80&&b.y<vh()+80)}
function updateParticles(dt){particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});particles=particles.filter(p=>p.life>0)}
function checkWaveClear(){if(gameState==='playing'&&enemiesToSpawn===0&&enemies.length===0){gameState='upgrade';showUpgradeOptions()}}
function showUpgradeOptions(){const pool=[{title:'HP 증가',text:'최대 체력 +25, 체력 25 회복',apply(){player.maxHp+=25;player.hp=Math.min(player.maxHp,player.hp+25)}},{title:'포탄 개수 증가',text:'한 번에 발사하는 포탄 +1',apply(){player.shellCount++}},{title:'포탄 위력 강화',text:'포탄 공격력 +1',apply(){player.power++}}].sort(()=>Math.random()-.5);upgradeList.innerHTML='';pool.forEach(u=>{const b=document.createElement('button');b.className='upgrade-card';b.type='button';b.innerHTML=`<strong>${u.title}</strong>${u.text}`;b.onclick=()=>{u.apply();wave++;upgradeOverlay.classList.add('hidden');focusGame();startWave()};upgradeList.appendChild(b)});upgradeOverlay.classList.remove('hidden')}
function endGame(){gameState='over';if(!scoreSaved){addRanking(playerName,wave);scoreSaved=true}resultTitle.textContent='탱크가 파괴되었습니다';resultText.textContent=`${playerName}님은 Wave ${wave}까지 도달했습니다.`;gameOverOverlay.classList.remove('hidden')}
function drawGrid(){ctx.fillStyle='#d7dcd5';ctx.fillRect(0,0,vw(),vh());ctx.strokeStyle='rgba(96,112,101,.16)';for(let x=0;x<vw();x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,vh());ctx.stroke()}for(let y=0;y<vh();y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(vw(),y);ctx.stroke()}}
function drawPlayer(){const a=Math.atan2(mouse.y-player.y,mouse.x-player.x);ctx.save();ctx.translate(player.x,player.y);ctx.rotate(a);ctx.fillStyle='#6b737c';ctx.strokeStyle='#47515b';ctx.lineWidth=3;ctx.fillRect(-6,-9,38,18);ctx.strokeRect(-6,-9,38,18);ctx.beginPath();ctx.arc(0,0,player.radius,0,Math.PI*2);ctx.fillStyle='#0ea5d7';ctx.fill();ctx.strokeStyle='#17617a';ctx.stroke();ctx.restore()}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.atan2(player.y-e.y,player.x-e.x));ctx.fillStyle=e.type==='triangle'?'#f87171':'#f7d95b';ctx.strokeStyle='#67717b';ctx.lineWidth=3;if(e.type==='triangle'){ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-15,-17);ctx.lineTo(-15,17);ctx.closePath();ctx.fill();ctx.stroke()}else{ctx.fillRect(-16,-16,32,32);ctx.strokeRect(-16,-16,32,32)}ctx.restore()}
function drawBullets(){playerBullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fillStyle='#facc15';ctx.fill();ctx.strokeStyle='#7c6f19';ctx.stroke()});enemyBullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fillStyle='#f06455';ctx.fill();ctx.strokeStyle='#8f4039';ctx.stroke()})}
function drawParticles(){particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/.45);ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.globalAlpha=1})}
function draw(){drawGrid();if(!player)return;drawBullets();enemies.forEach(drawEnemy);drawPlayer();drawParticles()}
function update(dt){if(gameState!=='playing')return;updatePlayer(dt);updateEnemies(dt);updateBullets(dt);updateParticles(dt);checkWaveClear();updateHud();if(player.hp<=0)endGame()}
function gameLoop(time){const dt=Math.min(.033,(time-lastTime)/1000||0);lastTime=time;update(dt);draw();requestAnimationFrame(gameLoop)}
function setKey(k,v){keys[String(k).toLowerCase()]=v}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();setKey(k,true);if(k==='enter'&&!startOverlay.classList.contains('hidden'))resetGame()},{passive:false});
window.addEventListener('keyup',e=>setKey(e.key,false));
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;focusGame()},{passive:true});
canvas.addEventListener('mousedown',e=>{if(e.button!==0)return;focusGame();const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;mouse.down=true;e.preventDefault()},{passive:false});
window.addEventListener('mouseup',()=>mouse.down=false);
window.addEventListener('blur',()=>{mouse.down=false;for(const k in keys)keys[k]=false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
startButton.onclick=resetGame;restartButton.onclick=resetGame;gameOverRestartButton.onclick=()=>{gameOverOverlay.classList.add('hidden');startOverlay.classList.remove('hidden');playerNameInput.focus()};clearRankingButton.onclick=()=>{localStorage.removeItem(RANKING_KEY);renderRanking()};
window.addEventListener('resize',resizeCanvas);resizeCanvas();renderRanking();drawGrid();requestAnimationFrame(gameLoop);
