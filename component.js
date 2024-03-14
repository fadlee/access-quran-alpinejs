function quran() {
  return {
    currentIndex: this.$persist(0),
    currentPage: this.$persist(1),
    get currentSura() {
      return data.getSuraFromAyaIndex(thisQ.currentIndex);
    },
    get currentJuz() {
      return data.getJuzFromIndex(thisQ.currentIndex);
    },
    currentQari: this.$persist("muaiqly"),
    cmdStack: [],
    preloader: null,
    preloader2: null,
    isPlaying: false,
    dontChangeIndex: true,
    beep: null,
    wakeLock: false,
    wakeLockSupported: false,
    async init() {
      window.thisQ = this; // allow easy access from other context

      this.$refs.player.src = this.currentAudioUrl;

      this.beep = new Audio();
      // Base64 encoded beep sound
      this.beep.src =
        "data:audio/wav;base64,UklGRiIAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YXIAAAAAADQVAgAGQEAAAtEAAAL/wAA//8=";

      this.preloader = new Audio();
      this.preloader.preload = "auto";
      this.preloader.src = this.getAudioUrl(this.currentIndex + 1);
      this.preloader.load();

      this.preloader2 = new Audio();
      this.preloader2.preload = "auto";
      this.preloader2.src = this.getAudioUrl(
        data.getAyaIndexFromPage(this.currentPage + 1)
      );
      this.preloader2.load();

      this.resetScroll();

      const options = {
        root: this.$refs.wrap,
        threshold: 0.3, // Trigger when 50% of the element is out of view
      };

      const observer = new IntersectionObserver(this.handleSensors, options);
      document
        .querySelectorAll(".sensor")
        .forEach((sensor) => observer.observe(sensor));

      this.$watch("currentIndex", this.onIndexChange);
      this.$watch("currentPage", this.onPageChange);
    },
    body: {
      ["@click"]() {
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
          this.$refs.player.play();
          this.requestWakeLock();
        } else {
          this.$refs.player.pause();
          this.releaseWakeLock();
        }
      },
      ["@touchend.window"]() {
        this.handleCommand();
        this.resetScroll();
      },
    },
    player: {
      ["@ended"]() {
        this.action.nextAya();
      },
    },
    onIndexChange(newIndex) {
      thisQ.currentPage = data.getPageFromIndex(newIndex);

      thisQ.$refs.player.src = thisQ.currentAudioUrl;
      thisQ.$refs.player.load();

      if (thisQ.isPlaying) thisQ.$refs.player.play();

      thisQ.preloader.src = thisQ.getAudioUrl(thisQ.currentIndex + 1);
      thisQ.preloader.load();

      const nextPageUrl = thisQ.getAudioUrl(
        data.getAyaIndexFromPage(thisQ.currentPage + 1)
      );
      if (thisQ.preloader2.src != nextPageUrl) {
        thisQ.preloader2.src = nextPageUrl;
        thisQ.preloader2.load();
      }
    },
    onPageChange(newPage) {
      if (thisQ.dontChangeIndex) return;
      thisQ.currentIndex = data.getAyaIndexFromPage(newPage);
      thisQ.dontChangeIndex = true;
    },
    action: {
      nextAya() {
        thisQ.currentIndex = thisQ.currentIndex + 1;
      },
      prevAya() {
        thisQ.currentIndex = thisQ.currentIndex - 1;
      },
      nextPage() {
        if (thisQ.currentPage >= 604) return;
        thisQ.dontChangeIndex = false;
        thisQ.currentPage = thisQ.currentPage + 1;
      },
      prevPage() {
        if (thisQ.currentPage <= 1) return;
        thisQ.dontChangeIndex = false;
        thisQ.currentPage = thisQ.currentPage - 1;
      },
      nextSura() {
        if (thisQ.currentSura >= 114) return;

        thisQ.currentIndex = window.data.getAyaIndexFromSura(
          thisQ.currentSura + 1
        );
        return thisQ.currentSura;
      },
      prevSura() {
        if (thisQ.currentSura <= 1) return;

        thisQ.currentIndex = window.data.getAyaIndexFromSura(
          thisQ.currentSura - 1
        );
        return thisQ.currentSura;
      },
      nextJuz() {
        if (thisQ.currentJuz >= 30) return;

        thisQ.currentIndex = window.data.getAyaIndexFromJuz(
          thisQ.currentJuz + 1
        );
        return thisQ.currentJuz;
      },
      prevJuz() {
        if (thisQ.currentJuz <= 1) return;

        thisQ.currentIndex = window.data.getAyaIndexFromJuz(
          thisQ.currentJuz - 1
        );
        return thisQ.currentJuz;
      },
    },
    handleCommand() {
      const command = this.cmdStack.join(",");
      console.log(command);

      if (command == "bottom") {
        this.action.nextAya();
      }
      if (command == "top") {
        this.action.prevAya();
      }

      if (command == "left") {
        this.action.nextPage();
      }
      if (command == "right") {
        this.action.prevPage();
      }

      if (command == "top,left" || command == "left,top") {
        this.action.nextSura();
      }

      if (command == "top,right" || command == "right,top") {
        this.action.prevSura();
      }

      if (command == "left,left" || command == "left,right,left") {
        this.action.nextJuz();
      }

      if (command == "right,right" || command == "right,left,right") {
        this.action.prevJuz();
      }

      // Reset command stack
      this.cmdStack = [];
    },
    handleSensors(entries) {
      let visibleSensors = [];

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleSensors.push(entry.target.classList[1]); // Extract class name
        }
      });

      if (!visibleSensors.length) return;

      // Generate string command based on visible sensors
      let command = visibleSensors.join(",");
      thisQ.cmdStack.push(command);
      thisQ.playBeep(50, 1000);
    },
    resetScroll() {
      this.$refs.wrap.style.overflow = "hidden";

      this.$refs.wrap.scrollLeft =
        (this.$refs.scroller.offsetWidth - this.$refs.wrap.offsetWidth) / 2;
      this.$refs.wrap.scrollTop =
        (this.$refs.scroller.offsetHeight - this.$refs.wrap.offsetHeight) / 2;

      setTimeout(() => {
        this.$refs.wrap.style.overflow = "scroll";
      }, 100);
    },
    get page() {
      return window.data.getPageFromIndex(this.currentIndex);
    },
    get currentAudioUrl() {
      return this.getAudioUrl(this.currentIndex);
    },
    getAudioUrl(idx) {
      const [suraIdx, ayaIdx] = data.ayaIndex[idx];
      const sura = (suraIdx + 1).toString().padStart(3, "0");
      const aya = (ayaIdx + 1).toString().padStart(3, "0");
      const filename = `${sura}${aya}.mp3`;
      return `https://tanzil.net/res/audio/muaiqly/${filename}`;
      // return `https://everyayah.com/data/Maher_AlMuaiqly_64kbps/${filename}`;
    },
    playBeep(duration, frequency) {
      // Create audio context
      var audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Create oscillator node
      var oscillator = audioContext.createOscillator();
      oscillator.type = "sine"; // Sine wave
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // Set frequency

      // Connect oscillator to output
      oscillator.connect(audioContext.destination);

      // Start and stop oscillator after specified duration to create a beep
      oscillator.start();
      setTimeout(function () {
        oscillator.stop();
      }, duration);
    },
    async requestWakeLock() {
      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
        this.wakeLockSupported = true;
        console.log("Screen wake lock activated");
        // Do something while the screen is kept awake
        // For example, keep an Android device awake while a web page is active
      } catch (error) {
        console.error("Failed to activate wake lock: " + error);
      }
    },
    async releaseWakeLock() {
      if (this.wakeLock === false) return;
      try {
        await this.wakeLock.release();
        console.log("Screen wake lock released");
      } catch (error) {
        console.error("Failed to release wake lock: " + error);
      }
    },
  };
}
