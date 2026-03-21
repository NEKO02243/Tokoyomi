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
                if (window.currentView === 'battle' && !player.workStartTime) {
                    window.isPaused = false;
                    if (typeof startBattleLoop === 'function') startBattleLoop();
                }

                // 增加高亮引導到結界之里按鈕
                let tVil = document.getElementById('t-village');
                if (tVil) tVil.classList.add('highlight-building');
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
