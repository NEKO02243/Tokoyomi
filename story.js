/* ==========================================================================
   📖 劇情與對話系統 (story.js)
   ========================================================================== */

const StoryManager = {
    backdrop: null,
    overlay: null,

    init: function () {
        if (!this.backdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'story-mode-overlay';
            document.body.appendChild(this.backdrop);
        }

        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'dialog-overlay';

            const nameTag = document.createElement('div');
            nameTag.className = 'dialog-name-tag';

            const textBox = document.createElement('p');
            textBox.className = 'dialog-text';

            const blinkIcon = document.createElement('div');
            blinkIcon.className = 'dialog-next-icon';
            blinkIcon.innerHTML = '▼';

            this.overlay.appendChild(nameTag);
            this.overlay.appendChild(textBox);
            this.overlay.appendChild(blinkIcon);

            document.body.appendChild(this.overlay);
        }
    },

    show: function (name, text, callback) {
        this.init();

        let nameTag = this.overlay.querySelector('.dialog-name-tag');
        let textBox = this.overlay.querySelector('.dialog-text');

        nameTag.innerText = name;
        textBox.innerHTML = text; // 支援簡單斷行或標籤

        if (this.backdrop.style.display !== 'block') {
            this.backdrop.style.display = 'block';
            this.overlay.style.display = 'block';

            // Re-trigger CSS animation
            this.overlay.style.animation = 'none';
            this.overlay.offsetHeight;
            this.overlay.style.animation = null;
        }

        this.backdrop.onclick = this.overlay.onclick = () => {
            if (typeof callback === 'function') {
                callback();
            } else {
                this.hide();
            }
        };
    },

    hide: function () {
        if (this.backdrop) this.backdrop.style.display = 'none';
        if (this.overlay) this.overlay.style.display = 'none';
    }
};

function runIntro() {
    StoryManager.show("巫女 美香", "呼...好險！旅人，快往這邊站一點！剛才那隻野狼差點就撲到你了喔。", () => {
        StoryManager.show("巫女 美香", "我是這個村子的巫女 美香。看你的樣子，應該不是這邊村子裡的人吧？別擔心，這附近的野獸還不算太恐怖，正好讓你活動一下筋骨。", () => {
            StoryManager.show("巫女 美香", "我就在前面的「結界之里」等你。如果你習慣了戰鬥、或是覺得累了，就順著鈴鐺聲回村子找我吧！", () => {
                StoryManager.hide();
                player.hasSeenIntro = true;
                if (typeof window !== 'undefined') window.isStoryPlaying = false; // 移除控制標記
                saveGame(false);
                if (currentView === 'battle' && !player.workStartTime) {
                    isPaused = false;
                    if (typeof startBattleLoop === 'function') startBattleLoop();
                }

                // 增加高亮引導到結界之里按鈕
                let tVil = document.getElementById('t-village');
                if (tVil) tVil.classList.add('highlight-building');
            });
        });
    });
}

// ✨ 全新實裝的：誠一竹林初遇 (含震動特效與前置裝備檢查)
function runSeiichiEncounterLite() {
    StoryManager.show("御前武士", "（喘著粗氣）中隊長...後方的怪物又補上來了！這已經不知道是第幾波攻擊了，這片林子的怪物根本不正常！", () => {
        StoryManager.show("楠木 誠一", "（揮刀斬開一隻小鬼，手臂已在發抖）嘖，這就是所謂的消耗戰嗎...再這樣下去，大家連撤退的力氣都沒了...。", () => {

            // 💡 觸發畫面震動特效
            document.body.classList.add('screen-shake');
            setTimeout(() => document.body.classList.remove('screen-shake'), 400); // 0.4秒後移除 class 以便下次觸發

            StoryManager.show("玩家", "（妳及時介入戰鬥，用法器揮出凌厲的一擊，瞬間擊退了周圍的怪物！）", () => {
                StoryManager.show("楠木 誠一", "（收刀拄地，對妳點了點頭）多謝了妳的協助。我是青衛隊的誠一...說來慚愧，我們這群人竟然被這些殺不完的小嘍囉耗盡了體力。", () => {
                    StoryManager.show("楠木 誠一", "（指向竹林更深處）這片林子的異樣源頭，是前方那尊發狂的『荒廢石獅子』。只要它還在吸納周圍的氣息，這些小怪就會不斷重生。", () => {
                        StoryManager.show("楠木 誠一", "但我帶來的弟兄已經到極限了...旅人，你看起來還有餘力。能不能請你先行一步去討伐那尊石獅子？", () => {
                            StoryManager.show("楠木 誠一", "別擔心，我的人會守在這裡，幫妳截斷後方湧上來的怪群。妳只管專心對付前面那個大傢伙，後背就交給我們！", () => {
                                StoryManager.hide();
                                markStoryDone('seiichi_encounter_lite');
                                if (typeof addItemToBag === 'function') addItemToBag('m_magic_core', 1);
                                if (typeof showToast === 'function') showToast("誠一小隊已為您封鎖後路。", "var(--quest)");

                                isPaused = false;
                                if (player.mapIdx === 2 && maps[player.mapIdx].boss) { log("⚔️ 誠一的請求：荒廢石獅子降臨！", "var(--danger)"); spawn(true); } else { spawn(false); }
                                if (currentView === 'battle' && typeof startBattleLoop === 'function') startBattleLoop(); // ✨ 確保劇情結束後自動開打
                            });
                        });
                    });
                });
            });
        });
    });
}

// ✨ 新增：擊敗石獅子後的結算劇情
function runSeiichiVictoryLite() {
    StoryManager.show("楠木 誠一", "（看著轟然倒塌的石獅子，長長地舒了一口氣）太精彩了...沒想到妳真的憑一己之力討伐了這頭怪物。", () => {
        StoryManager.show("楠木 誠一", "周圍的妖氣已經開始消散了，弟兄們也終於能喘口氣。這次真的欠妳一個天大的的人情。", () => {
            StoryManager.show("楠木 誠一", "如果妳之後有機會來到「御庭」，請務必讓我們青衛隊好好招待妳。那麼，我們就先帶著傷兵撤退了，後會有期！", () => {
                StoryManager.hide();
                markStoryDone('seiichi_victory_lite'); // 標記劇情完成

                // ✨ 贈送結算謝禮 (可選)
                if (typeof addItemToBag === 'function') {
                    addItemToBag('p5', 3); // 送 3 個百年靈芝
                    if (typeof showToast === 'function') showToast("獲得 誠一的謝禮 (百年靈芝 x3)", "var(--quest)");
                    log("🎁 楠木誠一臨走前塞給妳一些高級補給品。", "var(--quest)");
                }

                // 恢復遊戲循環，刷出下一張地圖的怪
                isPaused = false;
                spawn(false);
                if (currentView === 'battle' && typeof startBattleLoop === 'function') startBattleLoop();
            });
        });
    });
}

function runSmithyIntro() {
    StoryManager.show("虎徹師傅", "<span style='color:#aaa; font-size:0.9em;'>（背景傳來規律的打鐵聲 叮、叮、當、當）</span><br><br>生面孔啊？這陣子除了那群穿得整整齊齊、目中無人的<b style='color:var(--danger)'>『御前武士』</b>，很少有外地人敢來這了。", () => {
        StoryManager.show("虎徹師傅", "<span style='color:#aaa; font-size:0.9em;'>（師傅停下手上的錘子，用毛巾擦了擦汗，打量了妳一眼）</span><br><br>看妳全身都沒有帶一些裝備，這樣在野外戰鬥可是很危險的...", () => {
            StoryManager.show("虎徹師傅", "<span style='color:#aaa; font-size:0.9em;'>（師傅轉身從凌亂的櫃檯下抓出三件看起來毫不起眼的舊護具，直接丟在桌上）</span><br><br>拿去吧。這不是什麼名貴貨，就是些能護住心脈跟手腳的<b style='color:var(--gold)'>『法器』</b>，就當作是送給妳的見面禮了。", () => {
                StoryManager.show("虎徹師傅", "不過妳記好，這些護具現在只有基礎保暖的功能（數值皆為 +0）。想要發揮它真正的效果，帶足材料和錢再來找我吧。到那時候，我再幫妳進行<b style='color:var(--quest)'>『強化』</b>。", () => {
                    StoryManager.show("虎徹師傅", "還呆站在那邊做什麼？還不快滾！不要耽誤我的訂單進度！魔物一直來，訂單根本做不完啊！", () => {
                        StoryManager.hide();
                        player.hasMetBlacksmith = true;
                        saveGame(false);
                        // ✨ 確保 UI 狀態更新
                        if (typeof renderSmithy === 'function') renderSmithy();
                    });
                });
            });
        });
    });
}

function runVillageIntro() {
    StoryManager.show("巫女 美香", "這裡這裡！嘿，我遠遠就看到你穿過那個彎角了。哎呀，你的身手真的比我想像中還不錯耶，能從那些野獸手裡平安回來，真是太好了！", () => {
        StoryManager.show("巫女 美香", "雖然這附近有神宮的靈氣保佑，但那些野獸確實變得很兇猛。你能平安走進來，難道以前也受過什麼特別的訓練嗎？", () => {
            StoryManager.show("巫女 美香", "哎呀，你看起來一身寒氣，別在門口發呆了，跟我來！", () => {
                StoryManager.show("巫女 美香", "螢姊姊的茶早就泡好了，涼了就可惜啦，快進去！", () => {

                    // 開始黑幕轉場特效
                    StoryManager.hide();
                    let fade = document.createElement('div');
                    fade.style.position = 'fixed';
                    fade.style.top = '0'; fade.style.left = '0';
                    fade.style.width = '100vw'; fade.style.height = '100vh';
                    fade.style.backgroundColor = 'black';
                    fade.style.opacity = '0';
                    fade.style.transition = 'opacity 0.5s ease';
                    fade.style.zIndex = '3000';
                    fade.style.pointerEvents = 'all'; // 阻擋玩家在這段期間亂點
                    document.body.appendChild(fade);

                    // 觸發淡入
                    setTimeout(() => { fade.style.opacity = '1'; }, 10);

                    // 等待 0.5 秒全黑後切換畫面，並開始淡出
                    setTimeout(() => {
                        if (typeof showSubView === 'function') showSubView('teahouse');

                        setTimeout(() => {
                            fade.style.opacity = '0';

                            // 無縫接軌螢火茶屋的劇情
                            StoryManager.show("老闆娘 螢", "誒呀，是美香呀。今天也帶來了新客人呢，歡迎光臨「螢火茶屋」，我是老闆娘 螢。", () => {
                                StoryManager.show("巫女 美香", "嘿嘿，螢姊姊！這是我剛才在「靜謐荒野」救下來的旅人喔，他的身手可厲害了！", () => {
                                    StoryManager.show("老闆娘 螢", "外面的霧氣...又重了些吧？快請坐，爐火邊最暖和了。先喝口熱茶潤潤嗓子，這杯茶算我請客的。", () => {
                                        StoryManager.show("老闆娘 螢", "在此刻，你不必急著出發。在「螢火」燃燒的時候，這裡就是你最安心的家。", () => {
                                            StoryManager.show("老闆娘 螢", "呵呵，既然美香這麼推薦你，那你就在這兒多留一會吧。在我的茶屋裡，偶爾能接到一些村裡的委託任務，也歡迎隨時來這裡找大家聊聊天。", () => {
                                                StoryManager.show("老闆娘 螢", "對了，村子裡你都去看過了嗎？雖然地方不大，但也還有不少店鋪呢。有機會的話，請務必去店裡走走吧。", () => {
                                                    StoryManager.show("巫女 美香", "啊！時間不早了！螢姊姊，我也該回神社打掃了，晚點祭祀可不能遲到呢。", () => {
                                                        StoryManager.show("巫女 美香", "喂，旅人！我就在村裡的神社，有空隨時來找我玩喔！再見啦！", () => {
                                                            StoryManager.hide();
                                                            player.hasSeenVillageIntro = true;
                                                            player.hp = player.mhp || 100;
                                                            if (typeof showToast === 'function') showToast("你喝下了熱茶，感到溫暖的力量湧上全身。", "#e67e22");
                                                            if (typeof updateUI === 'function') updateUI();
                                                            saveGame(false);

                                                            // 解鎖畫面讓玩家自由參觀
                                                            if (typeof backToVillage === 'function') backToVillage();
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });

                            // 淡出完成後移除 DOM
                            setTimeout(() => { fade.remove(); }, 500);
                        }, 200); // 稍微停頓 0.2 秒再淡出更有感覺
                    }, 500);
                });
            });
        });
    });
}

function runShrineIntro() {
    StoryManager.show("巫女 美香", "喔！你來啦！螢姊姊的茶喝完了嗎？歡迎來到我們村子的守護之地——宵月神社！", () => {

        let subView = document.getElementById('sub-view');
        if (subView) {
            subView.style.transition = 'transform 3s cubic-bezier(0.25, 1, 0.5, 1)';
            subView.style.transform = 'scale(1.05) translateY(-5%)';
        }

        StoryManager.show("巫女 美香", "雖然這裡比不上後山上的神宮那麼宏偉，但在這兒祈禱的話...也許，神女大人也是能收到你許下的願望喔。", () => {

            if (subView) {
                subView.style.transform = 'scale(1) translateY(0)';
            }

            StoryManager.show("巫女 美香", "不過記得，沒事不要去後山那邊，那邊的神宮可不是誰都能去的呢。好啦，隨便看看吧，別客氣！", () => {
                StoryManager.hide();
                player.hasSeenShrineIntro = true;
                saveGame(false);
            });
        });
    });
}
