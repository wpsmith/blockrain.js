((function ( $ ) {

  "use strict";

    $.widget('aerolab.blockrain', {

        options: {
            autoplay: false, // Let a bot play the game
            autoplayRestart: true, // Restart the game automatically once a bot loses
            showFieldOnStart: true, // Show a bunch of random blocks on the start screen (it looks nice)
            theme: null, // The theme name or a theme object
            blockWidth: 10, // How many blocks wide the field is (The standard is 10 blocks)
            autoBlockWidth: false, // The blockWidth is dinamically calculated based on the autoBlockSize. Disabled blockWidth. Useful for responsive backgrounds
            autoBlockSize: 24, // The max size of a block for autowidth mode
            difficulty: 'normal', // Difficulty (normal|nice|evil).
            speed: 20, // The speed of the game. The higher, the faster the pieces go.
            asdwKeys: true, // Enable ASDW keys
            noPreview: true, // Disable Preview
            previewSelector: '', // Place it inside the game holder, force user to place it elsewhere.

            // Copy
            playText: 'Let\'s play some Tetris',
            playButtonText: 'Play',
            gameOverText: 'Game Over',
            restartButtonText: 'Play Again',
            scoreText: 'Score',
            previewText: 'Preview',

            // Basic Callbacks
            onStart: function () {
            },
            onRestart: function () {
            },
            onGameOver: function (score) {
            },
            onKeyPress: function (e) {
            },
            onDrop: function (curr, next) {
            },

            // When a line is made. Returns the number of lines, score assigned and total score
            onLine: function (lines, scoreIncrement, score) {
            }
        },

        /** PUBLIC API **?
         /**
         * Start Game
         */
        start: function () {
            this._doStart();
            this.options.onStart.call(this.element);
        },

        /**
         * Restart Game
         */
        restart: function () {
            this._doStart();
            this.options.onRestart.call(this.element);
        },

        /**
         * Game Over.
         */
        gameover: function () {
            this.showGameOverMessage();
            this._board.gameover = true;
            this.options.onGameOver.call(this.element, this._gameFilled.score);
        },

        /**
         * Gets the game status.
         *
         * @returns {string} Game status ('paused', 'started', 'gameover', 'nogame')
         */
        status: function () {
            if (this._board.paused) {
                return 'paused';
            }
            if (this._board.gameover) {
                return 'gameover';
            }
            if (this._board.started) {
                return 'started';
            }
            return 'nogame';
        },

        /**
         * Pauses/Resumes game.
         */
        pause: function () {
            if (this._board.paused) {
                this.resume();
            }
            else {
                this._board.paused = true
            }
            ;
        },

        /**
         * Resumes game.
         */
        resume: function () {
            this._board.paused = false;
        },

        /**
         * Autoplays the game.
         * @param enable
         */
        autoplay: function (enable) {
            if (typeof enable !== 'boolean') {
                enable = true;
            }

            // On autoplay, start the game right away
            this.options.autoplay = enable;
            if (enable && !this._board.started) {
                this._doStart();
            }
            this._setupControls(!enable);
        },

        /**
         * Sets up the game controls.
         *
         * @param {bool} enable Whether to enable the controls.
         */
        controls: function (enable) {
            if (typeof enable !== 'boolean') {
                enable = true;
            }
            this._setupControls(enable);
        },

        /**
         * Score tracking.
         *
         * @param {int} newScore Score update.
         * @returns {aerolab.blockrain.score|Function|number|*|Number}
         */
        score: function (newScore) {
            if (typeof newScore !== 'undefined' && parseInt(newScore) >= 0) {
                this._gameFilled.score = parseInt(newScore);
                this._$scoreText.text(this._gameFilled_score);
            }
            return this._gameFilled.score;
        },

        /**
         * Adds Preview.
         * @param nextShape
         */
        preview: function (nextShape) {
            this._previewCtx.clearRect(0, 0, this._PIXEL_WIDTH, this._PIXEL_HEIGHT);
            this._drawBackground(this._previewCtx);
            this._previewFilled.draw();
            nextShape.preview();
        },

        /**
         * Shows start message
         */
        showStartMessage: function () {
            this._$start.show();
        },

        /**
         * Shows game over message.
         */
        showGameOverMessage: function () {
            this._$gameover.show();
        },

        /**
         * Update the sizes of the renderer (this makes the game responsive).
         */
        updateSizes: function () {

            this._PIXEL_WIDTH = this.element.innerWidth();
            this._PIXEL_HEIGHT = this.element.innerHeight();

            this._BLOCK_WIDTH = this.options.blockWidth;
            this._BLOCK_HEIGHT = Math.floor(this.element.innerHeight() / this.element.innerWidth() * this._BLOCK_WIDTH);

            this._block_size = Math.floor(this._PIXEL_WIDTH / this._BLOCK_WIDTH);
            this._border_width = 2;

            // Recalculate the pixel width and height so the canvas always has the best possible size
            this._PIXEL_WIDTH = this._block_size * this._BLOCK_WIDTH;
            this._PIXEL_HEIGHT = this._block_size * this._BLOCK_HEIGHT;

            this._$canvas.attr('width', this._PIXEL_WIDTH)
                .attr('height', this._PIXEL_HEIGHT);
        },

        /**
         * Sets the theme
         * @param {string} newTheme Theme name. See window.BlockrainThemes.
         * @returns {null|aerolab.blockrain._theme|{}}
         */
        theme: function (newTheme) {

            if (typeof newTheme === 'undefined') {
                return this.options.theme || this._theme;
            }

            // Setup the theme properly
            if (typeof newTheme === 'string') {
                this.options.theme = newTheme;
                this._theme = BlockrainThemes[newTheme];
            }
            else {
                this.options.theme = null;
                this._theme = newTheme;
            }

            if (typeof this._theme === 'undefined' || this._theme === null) {
                this._theme = BlockrainThemes['retro'];
                this.options.theme = 'retro';
            }

            if (isNaN(parseInt(this._theme.strokeWidth)) || typeof parseInt(this._theme.strokeWidth) !== 'number') {
                this._theme.strokeWidth = 2;
            }

            // Load the image assets
            this._preloadThemeAssets();

            if (this._board !== null) {
                if (typeof this._theme.background === 'string') {
                    this._$canvas.css('background-color', this._theme.background);
                }
                this._board.render();
            }
        },

        /** PRIVATE API **/
        // Actually start everything
        _doStart: function () {
            // Clear the game
            this._gameFilled.clearAll();
            this._gameFilled._resetScore();

            // Set the current and next shape
            this._board.cur = this._board.next || this._board.nextShape();
            this._board.setNextShape();

            // Change the status
            this._board.started = true;
            this._board.gameover = false;

            // Drop the shape & show preview
            this._board.animate();
            this._board.showPreview();

            // UI transition
            this._$start.fadeOut(150);
            this._$gameover.fadeOut(150);
            this._$score.fadeIn(150);
        },

        // Theme object
        _theme: {},

        /** UI OBJECTS **/
        // Game UI
        _$game: null,

        // Game Canvas
        _$canvas: null,

        // Game container
        _$gameholder: null,

        // Start container
        _$start: null,

        // Game Over container
        _$gameover: null,

        // Score container
        _$score: null,

        // Score text
        _$scoreText: null,


        /** CANVAS OBJECTS **/
        // Game canvas
        _canvas: null,

        // Game 2d context
        _ctx: null,

        // Preview canvas
        _previewCanvas: null,

        // Preview 2d context
        _previewCtx: null,


        // Initialization
        _create: function () {
            // Cache the game
            var game = this;

            // Set the theme
            this.theme(this.options.theme);

            // Create the game holder
            this._createHolder();

            // Create the UI
            this._createUI();

            // Resize Block Sizes
            this._refreshBlockSizes();

            // Update sizes based on viewport?
            this.updateSizes();

            // Update sizes when screen resized
            //$(window).resize(function () {
            //    game.updateSizes();
            //});

            // Initialize shapes
            this._SetupShapeFactory();

            // Prep the gameboard
            this._SetupFilled();

            // Setup the gameboad complexity/difficulty
            this._SetupInfo();

            // Draw the gameboard
            this._SetupBoard();

            // Initialize the board
            this._info.init();
            this._board.init();

            // Maybe do autoplay
            if (this.options.autoplay) {
                this.autoplay(true);
            } else {
                this._setupControls(true);
            }

        },

        // Check to see if the blocks landed
        _checkCollisions: function (x, y, blocks, checkDownOnly) {
            // x & y should be aspirational values
            var i = 0, len = blocks.length, a, b;
            for (; i < len; i += 2) {
                a = x + blocks[i];
                b = y + blocks[i + 1];

                if (b >= this._BLOCK_HEIGHT || this._gameFilled.check(a, b)) {
                    return true;
                } else if (!checkDownOnly && a < 0 || a >= this._BLOCK_WIDTH) {
                    return true;
                }
            }
            return false;
        },

        // Board objects
        _board: null,

        // Board info
        _info: null,

        // Game canvas filling
        _gameFilled: null,

        /**
         * Draws the themed background based on the context.
         *
         * @param {object} ctx Canvas context.
         * @private
         */
        _drawBackground: function (ctx) {

            // set context
            ctx = ctx || this._ctx;

            // Make sure we have a theme
            if (ctx === this._previewCtx || typeof this._theme.background !== 'string') {
                return;
            }

            if (this._theme.backgroundGrid instanceof Image) {

                // Not loaded
                if (this._theme.backgroundGrid.width === 0 || this._theme.backgroundGrid.height === 0) {
                    return;
                }

                ctx.globalAlpha = 1.0;

                for (var x = 0; x < this._BLOCK_WIDTH; x++) {
                    for (var y = 0; y < this._BLOCK_HEIGHT; y++) {
                        var cx = x * this._block_size;
                        var cy = y * this._block_size;

                        ctx.drawImage(this._theme.backgroundGrid,
                            0, 0, this._theme.backgroundGrid.width, this._theme.backgroundGrid.height,
                            cx, cy, this._block_size, this._block_size);
                    }
                }

            }
            else if (typeof this._theme.backgroundGrid === 'string') {

                var borderWidth = this._theme.strokeWidth;
                var borderDistance = Math.round(this._block_size * 0.23);
                var squareDistance = Math.round(this._block_size * 0.30);

                ctx.globalAlpha = 1.0;
                ctx.fillStyle = this._theme.backgroundGrid;

                for (var x = 0; x < this._BLOCK_WIDTH; x++) {
                    for (var y = 0; y < this._BLOCK_HEIGHT; y++) {
                        var cx = x * this._block_size;
                        var cy = y * this._block_size;

                        ctx.fillRect(cx + borderWidth, cy + borderWidth, this._block_size - borderWidth * 2, this._block_size - borderWidth * 2);
                    }
                }

            }

            ctx.globalAlpha = 1.0;
        },

        /**
         * Sets the preview block size
         * @private
         */
        _setPreviewBlockSize: function() {
            this._autoBlockSize = this.autoBlockSize;
            this.autoBlockSize = 10;
            this.updateSizes();
        },

        /**
         * Resets the block size for use by the board.
         * @private
         */
        _resetPreviewBlockSize: function() {
            this.autoBlockSize = this._autoBlockSize;
            this.updateSizes();
        },

        /**
         * Draws one block (Each piece is made of 4 blocks)
         * The blockType is used to draw any block.
         * The falling attribute is needed to apply different styles for falling and placed blocks.
         *
         * @param {int} x Horizontal position.
         * @param {int} y Vertical position.
         * @param {string} blockType Block type.
         * @param {bool} falling Whether the block is animating.
         * @param {object} ctx Canvas context.
         * @private
         */
        _drawBlock: function (x, y, blockType, type, ctx) {

            // set context
            ctx = ctx || this._ctx;

            // set falling
            var falling = ('falling' === type),
                preview = ('preview' === type),
                blockSize;

            blockSize = this._block_size;

            // convert x and y to pixel
            x = x * blockSize;
            y = y * blockSize;

            // set object size information
            var borderWidth = this._theme.strokeWidth,
                borderDistance = Math.round(blockSize * 0.23),
                squareDistance = Math.round(blockSize * 0.30),

            // set color
                color = preview ? 'transparent' : this._getBlockColor(blockType, falling);

            // Draw the main square
            ctx.globalAlpha = 1.0;

            // If it's an image, the block has a specific texture. Use that.
            if (color instanceof Image) {
                ctx.globalAlpha = 1.0;

                // not loaded
                if (color.width === 0 || color.height === 0) {
                    return;
                }

                ctx.drawImage(color, 0, 0, color.width, color.height, x, y, blockSize, blockSize);

            }
            else if (typeof color === 'string') {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, blockSize, blockSize);

                // Inner Shadow
                if (typeof this._theme.innerShadow === 'string') {
                    ctx.globalAlpha = 1.0;
                    ctx.strokeStyle = this._theme.innerShadow;
                    ctx.lineWidth = 1.0;

                    // Draw the borders
                    ctx.strokeRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
                }

                // Decoration (borders)
                if (typeof this._theme.stroke === 'string') {
                    ctx.globalAlpha = 1.0;
                    ctx.fillStyle = this._theme.stroke;
                    ctx.strokeStyle = this._theme.stroke;
                    ctx.lineWidth = borderWidth;

                    // Draw the borders
                    ctx.strokeRect(x, y, blockSize, blockSize);
                }
                if (typeof this._theme.innerStroke === 'string') {
                    // Draw the inner dashes
                    ctx.fillStyle = this._theme.innerStroke;
                    ctx.fillRect(x + borderDistance, y + borderDistance, blockSize - borderDistance * 2, borderWidth);
                    // The rects shouldn't overlap, to prevent issues with transparency
                    ctx.fillRect(x + borderDistance, y + borderDistance + borderWidth, borderWidth, blockSize - borderDistance * 2 - borderWidth);
                }
                if (typeof this._theme.innerSquare === 'string') {
                    // Draw the inner square
                    ctx.fillStyle = this._theme.innerSquare;
                    ctx.globalAlpha = 0.2;
                    ctx.fillRect(x + squareDistance, y + squareDistance, blockSize - squareDistance * 2, blockSize - squareDistance * 2);
                }
            }

            // Return the alpha back to 1.0 so we don't create any issues with other drawings.
            ctx.globalAlpha = 1.0;


        },

        /**
         * Draws one block (Each piece is made of 4 blocks) for preview
         * The blockType is used to adjust x & y for centering on preview canvas.
         *
         * @see _drawBlock
         * @param {int} x Horizontal position.
         * @param {int} y Vertical position.
         * @param {string} blockType Block type.
         * @private
         */
        _drawPreviewBlock: function (x, y, blockType) {
            // Temporarily set the block size to draw big enough blocks
            this._setPreviewBlockSize();

            // square = 50; line = 25; other = 70;
            // Area available = 100
            // Center block on canvas
            switch(blockType) {
                case 'line':
                    y += 4;
                    x++;
                    break;
                case 'rightHook':
                case 'leftHook':
                case 'rightZag':
                case 'leftZag':
                    y += 2;
                    break;
                case 'arrow':
                    y+= 3;
                    break;
                case 'square':
                    y+=2;
                    x += 0.5;
                    break;
            }

            // Draw on the canvas
            this._drawBlock( x, y, blockType, 'preview', this._previewCtx);

            // Return autosize
            this._resetPreviewBlockSize();
        },

        /**
         * Gets the block color.
         *
         * The theme allows us to do many things:
         * - Use a specific color for the falling block (primary), regardless of the proper color.
         * - Use another color for the placed blocks (secondary).
         * - Default to the "original" block color in any of those cases by setting primary and/or secondary to null.
         * - With primary and secondary as null, all blocks keep their original colors.
         *
         * @param {string} blockName Name of the block.
         * @param {bool} falling Whether the block is animating
         * @returns {*} Hex color value.
         * @private
         */
        _getBlockColor: function (blockName, falling) {
            if (typeof falling !== 'boolean') {
                falling = true;
            }
            if (falling) {
                if (typeof this._theme.primary === 'string' && this._theme.primary !== '') {
                    return this._theme.primary;
                } else {
                    return this._theme.blocks[blockName];
                }
            } else {
                if (typeof this._theme.secondary === 'string' && this._theme.secondary !== '') {
                    return this._theme.secondary;
                } else {
                    return this._theme.blocks[blockName];
                }
            }
        },

        // shape holder
        _shapeFactory: null,

        /**
         * Sets up the Shape class & the shape factory once.
         * Shape factory contains the following shapes:
         *      line, square, arrow, right hook, left hook
         *      left zag, right zag
         *
         * @private
         */
        _SetupShapeFactory: function () {
            var game = this;
            if (this._shapeFactory !== null) {
                return;
            }

            /**
             * Shape Object
             *
             * @param {object} game Blockrain object.
             * @param {array} orientations Array of position values.
             * @param {bool} symmetrical Whether the object is symmetrical.
             * @param {string} blockType Block Type or Name.
             * @returns {*}
             * @constructor
             */
            function Shape(game, orientations, symmetrical, blockType) {

                $.extend(this, {
                    x: 0,
                    y: 0,
                    symmetrical: symmetrical,
                    init: function () {
                        $.extend(this, {
                            orientation: 0,
                            x: Math.floor(game._BLOCK_WIDTH / 2) - 1,
                            y: -1
                        });
                        return this;
                    },
                    blockType: blockType,
                    blocksLen: orientations[0].length,
                    orientations: orientations,
                    orientation: 0, // 4 possible
                    rotate: function (right) {
                        var orientation = (this.orientation + (right ? 1 : -1) + 4) % 4;

                        //TODO - when past limit - auto shift and remember that too!
                        if (!game._checkCollisions(this.x, this.y, this.getBlocks(orientation))) {
                            this.orientation = orientation;
                        }
                    },
                    moveRight: function () {
                        if (!game._checkCollisions(this.x + 1, this.y, this.getBlocks())) {
                            this.x++;
                        }
                    },
                    moveLeft: function () {
                        if (!game._checkCollisions(this.x - 1, this.y, this.getBlocks())) {
                            this.x--;
                        }
                    },
                    getBlocks: function (orientation) { // optional param
                        return this.orientations[orientation !== undefined ? orientation : this.orientation];
                    },
                    draw: function (drop, _x, _y, _orientation) {
                        if (drop) {
                            this.y++;
                        }

                        var blocks = this.getBlocks(_orientation),
                            x = _x === undefined ? this.x : _x,
                            y = _y === undefined ? this.y : _y,
                            i = 0;

                        for (; i < this.blocksLen; i += 2) {
                            game._drawBlock(x + blocks[i], y + blocks[i + 1], this.blockType, 'falling');
                        }
                    },
                    preview: function () {
                        var blocks = this.getBlocks(),
                            i = 0;
                        game._drawBackground(game._previewCtx);
                        for (; i < this.blocksLen; i += 2) {
                            game._drawPreviewBlock(blocks[i], blocks[i + 1], this.blockType);
                        }


                    },
                    getBounds: function (_blocks) { // _blocks can be an array of blocks, an orientation index, or undefined
                        var blocks = $.isArray(_blocks) ? _blocks : this.getBlocks(_blocks),
                            i = 0, len = blocks.length, minx = 999, maxx = -999, miny = 999, maxy = -999;
                        for (; i < len; i += 2) {
                            if (blocks[i] < minx) {
                                minx = blocks[i];
                            }
                            if (blocks[i] > maxx) {
                                maxx = blocks[i];
                            }
                            if (blocks[i + 1] < miny) {
                                miny = blocks[i + 1];
                            }
                            if (blocks[i + 1] > maxy) {
                                maxy = blocks[i + 1];
                            }
                        }
                        return {
                            left: minx,
                            right: maxx,
                            top: miny,
                            bottom: maxy,
                            width: maxx - minx,
                            height: maxy - miny
                        };
                    }
                });

                return this.init();
            };

            /**
             * Shape factory
             *
             * @type {{line: Function, square: Function, arrow: Function, rightHook: Function, leftHook: Function, leftZag: Function, rightZag: Function}}
             * @private
             */
            this._shapeFactory = {
                line: function () {
                    /*
                     *   X        X
                     *   O  XOXX  O XOXX
                     *   X        X
                     *   X        X
                     */
                    var ver = [0, -1, 0, -2, 0, -3, 0, -4],
                        hor = [-1, -2, 0, -2, 1, -2, 2, -2];
                    return new Shape(game, [ver, hor, ver, hor], true, 'line');
                },
                square: function () {
                    /*
                     *  XX
                     *  XX
                     */
                    var s = [0, 0, 1, 0, 0, -1, 1, -1];
                    return new Shape(game, [s, s, s, s], true, 'square');
                },
                arrow: function () {
                    /*
                     *    X   X       X
                     *   XOX  OX XOX XO
                     *        X   X   X
                     */
                    return new Shape(game, [
                        [0, -1, 1, -1, 2, -1, 1, -2],
                        [1, -2, 1, -1, 1, 0, 2, -1],
                        [0, -1, 1, -1, 2, -1, 1, 0],
                        [0, -1, 1, -1, 1, -2, 1, 0]
                    ], false, 'arrow');
                },
                rightHook: function () {
                    /*
                     *       XX   X X
                     *   XOX  O XOX O
                     *   X    X     XX
                     */
                    return new Shape(game, [
                        [0, 0, 0, -1, 1, -1, 2, -1],
                        [0, -2, 1, 0, 1, -1, 1, -2],
                        [0, -1, 1, -1, 2, -1, 2, -2],
                        [0, -2, 0, -1, 0, 0, 1, 0]
                    ], false, 'rightHook');
                },
                leftHook: function () {
                    /*
                     *        X X   XX
                     *   XOX  O XOX O
                     *     X XX     X
                     */
                    return new Shape(game, [
                        [2, 0, 0, -1, 1, -1, 2, -1],
                        [0, 0, 1, 0, 1, -1, 1, -2],
                        [0, -2, 0, -1, 1, -1, 2, -1],
                        [0, 0, 0, -1, 0, -2, 1, -2]
                    ], false, 'leftHook');
                },
                leftZag: function () {
                    /*
                     *        X
                     *   XO  OX
                     *    XX X
                     */
                    var ver = [0, 0, 0, -1, 1, -1, 1, -2],
                        hor = [0, -1, 1, -1, 1, 0, 2, 0];
                    return new Shape(game, [hor, ver, hor, ver], true, 'leftZag');
                },
                rightZag: function () {
                    /*
                     *       X
                     *    OX OX
                     *   XX   X
                     */
                    var ver = [0, -2, 0, -1, 1, -1, 1, 0],
                        hor = [0, 0, 1, 0, 1, -1, 2, -1];
                    return new Shape(game, [hor, ver, hor, ver], true, 'rightZag');
                }
            };

        },

        /**
         * Setup the game fill
         * @private
         */
        _SetupFilled: function () {
            var game = this;
            if (this._filled !== null && this._previewFilled !== null && this._gameFilled !== null) {
                return;
            }

            // Base Fill object
            this._filled = {
                data: new Array(game._BLOCK_WIDTH * game._BLOCK_HEIGHT),
                toClear: {},
                check: function (x, y) {
                    return this.data[this.asIndex(x, y)];
                },
                add: function (x, y, blockType) {
                    if (x >= 0 && x < game._BLOCK_WIDTH && y >= 0 && y < game._BLOCK_HEIGHT) {
                        this.data[this.asIndex(x, y)] = blockType;
                    }
                },
                asIndex: function (x, y) {
                    return x + y * game._BLOCK_WIDTH;
                },
                asX: function (index) {
                    return index % game._BLOCK_WIDTH;
                },
                asY: function (index) {
                    return Math.floor(index / game._BLOCK_WIDTH);
                },
                clearAll: function () {
                    delete this.data;
                    this.data = new Array(game._BLOCK_WIDTH * game._BLOCK_HEIGHT);
                },
                _popRow: function (row_to_pop) {
                    for (var i = game._BLOCK_WIDTH * (row_to_pop + 1) - 1; i >= 0; i--) {
                        this.data[i] = (i >= game._BLOCK_WIDTH ? this.data[i - game._BLOCK_WIDTH] : undefined);
                    }
                },
                checkForClears: function () {
                    var startLines = game._board.lines;
                    var rows = [], i, len, count, mod;

                    for (i = 0, len = this.data.length; i < len; i++) {
                        mod = this.asX(i);
                        if (mod == 0) count = 0;
                        if (this.data[i] && typeof this.data[i] == 'string') {
                            count += 1;
                        }
                        if (mod == game._BLOCK_WIDTH - 1 && count == game._BLOCK_WIDTH) {
                            rows.push(this.asY(i));
                        }
                    }

                    for (i = 0, len = rows.length; i < len; i++) {
                        this._popRow(rows[i]);
                        game._board.lines++;
                        if (game._board.lines % 10 == 0 && game._board.dropDelay > 1) {
                            //board.dropDelay -= 2;
                        }
                    }

                    var clearedLines = game._board.lines - startLines;
                    this._updateScore(clearedLines);
                },
                draw: function () {
                    for (var i = 0, len = this.data.length, row, color; i < len; i++) {
                        if (this.data[i] !== undefined) {
                            row = this.asY(i);
                            var blockType = this.data[i];
                            game._drawBlock(this.asX(i), row, blockType);
                        }
                    }
                }
            };

            // Preview Filled, no score
            this._previewFilled = $.extend(this._filled, {});

            // Game Filled, contains score
            this._gameFilled = $.extend(this._filled, {
                score: 0,
                _updateScore: function (numLines) {
                    if (numLines <= 0) {
                        return;
                    }
                    var scores = [0, 400, 1000, 3000, 12000];
                    if (numLines >= scores.length) {
                        numLines = scores.length - 1
                    }

                    this.score += scores[numLines];
                    game._$scoreText.text(this.score);

                    game.options.onLine.call(game.element, numLines, scores[numLines], this.score);
                },
                _resetScore: function () {
                    this.score = 0;
                    game._$scoreText.text(this.score);
                }
            });
        },

        /**
         * Game Setup values.
         *      -Mode
         *      -Difficulty
         *      -Autopilot
         * @private
         */
        _SetupInfo: function () {

            var game = this;

            /**
             * Information object.
             *
             * @type {{mode: string, modes: string[], modesY: number, autopilotY: null, init: Function, setMode: Function}}
             * @private
             */
            this._info = {
                mode: game.options.difficulty,
                modes: [
                    'normal',
                    'nice',
                    'evil'
                ],
                modesY: 170,
                autopilotY: null,

                init: function () {
                    this.mode = game.options.difficulty;
                },
                setMode: function (mode) {
                    this.mode = mode;
                    //game._board.nextShape(true);
                }
            };

        },

        /**
         * Sets up the board for play.
         *
         * @private
         */
        _SetupBoard: function () {

            var game = this;
            var info = this._info

            /**
             * The game board
             *
             * @type {{animateDelay: number, cur: null, lines: number, dropCount: number, dropDelay: number, started: boolean, gameover: boolean, init: Function, showStartMessage: Function, showGameOverMessage: Function, showPreview: Function, setNextShape: Function, nextShape: Function, animate: Function, createRandomBoard: Function, render: Function}}
             * @private
             */
            this._board = {
                animateDelay: 1000 / game.options.speed,
                cur: null,

                lines: 0,

                dropCount: 0,
                dropDelay: 5, //5,


                started: false,
                gameover: false,

                /**
                 * Initializes the board.
                 *      -Sets current & next shape
                 *      -Draws the background
                 *      -Creates a random board
                 *      -Renders the board
                 *      -Shows start message
                 */
                init: function () {
                    this.cur = this.nextShape();
                    this.setNextShape();

                    if (game.options.showFieldOnStart) {
                        game._drawBackground();
                        game._board.createRandomBoard();
                        game._board.render();
                    }

                    this.showStartMessage();

                },

                /**
                 * Reveals the start message
                 */
                showStartMessage: function () {
                    game._$start.show();
                },

                /**
                 * Reveals the game over message
                 */
                showGameOverMessage: function () {
                    game._$gameover.show();
                },

                /**
                 * Reveals the preview
                 */
                showPreview: function () {
                    //console.log('showPreview');
                    if (!game.options.noPreview) {
                        game._$preview.show();
                    }
                },

                /**
                 * Sets the next shape.
                 */
                setNextShape: function () {
                    this.next = this.nextShape();

                    if (!game.options.noPreview) {
                        game.preview(this.next);
                    }

                    if (game.options.autoplay) { //fun little hack...
                        game._niceShapes(game._gameFilled, game._checkCollisions, game._BLOCK_WIDTH, game._BLOCK_HEIGHT, 'normal', result);
                        result.orientation = result.best_orientation;
                        result.x = result.best_x;
                    }
                },

                /**
                 * Gets the next shape.
                 *
                 * @returns {Shape} Shape to be drawn next.
                 */
                nextShape: function () {
                    var next, func, shape, result;
                    if (info.mode == 'nice' || info.mode == 'evil') {
                        func = game._niceShapes;
                    }
                    else {
                        func = game._randomShapes();
                    }

                    shape = func(game._gameFilled, game._checkCollisions, game._BLOCK_WIDTH, game._BLOCK_HEIGHT, info.mode);
                    if (!shape) {
                        throw new Error('No shape returned from shape function!', func);
                    }
                    shape.init();
                    return shape;
                },

                /**
                 * Animates the shape dropping down the screen.
                 */
                animate: function () {
                    var drop = false,
                        gameOver = false;

                    //game.updateSizes();
                    if (!this.paused && !this.gameover) {

                        // determine whether we are dropping a new block
                        this.dropCount++;
                        if (this.dropCount >= this.dropDelay || game.options.autoplay) {
                            drop = true;
                            this.dropCount = 0;
                        }

                        // test for a collision
                        if (drop) {
                            var cur = this.cur, x = cur.x, y = cur.y, blocks = cur.getBlocks();

                            if (game._checkCollisions(x, y + 1, blocks, true)) {
                                drop = false;
                                for (var i = 0; i < cur.blocksLen; i += 2) {
                                    game._gameFilled.add(x + blocks[i], y + blocks[i + 1], cur.blockType);
                                    if (y + blocks[i] < 0) {
                                        gameOver = true;
                                    }
                                }
                                game._gameFilled.checkForClears();
                                this.cur = this.next;
                                this.setNextShape();
                                game.options.onDrop.call(this.element, this.cur, this.next);
                            }
                        }

                        // Draw the blockrain field
                        game._ctx.clearRect(0, 0, game._PIXEL_WIDTH, game._PIXEL_HEIGHT);
                        game._drawBackground();
                        game._gameFilled.draw();
                        this.cur.draw(drop);
                    }

                    // maybe game over?
                    if (gameOver) {

                        this.gameover = true;

                        game.gameover();

                        if (game.options.autoplay && game.options.autoplayRestart) {
                            // On autoplay, restart the game automatically
                            game.restart();
                        }

                    } else {

                        // Update the speed
                        this.animateDelay = 1000 / game.options.speed;

                        window.setTimeout(function () {
                            game._board.animate();
                        }, this.animateDelay);

                    }

                },

                /**
                 * Creates a randomized pretty board.
                 */
                createRandomBoard: function () {

                    var start = [], blockTypes = [], i, ilen, j, jlen, color;

                    // Draw a random blockrain screen
                    blockTypes = Object.keys(game._shapeFactory);

                    for (i = 0, ilen = game._BLOCK_WIDTH; i < ilen; i++) {
                        for (j = 0, jlen = game._randChoice([game._randInt(0, 8), game._randInt(5, 9)]); j < jlen; j++) {
                            if (!color || !game._randInt(0, 3)) color = game._randChoice(blockTypes);

                            game._gameFilled.add(i, game._BLOCK_HEIGHT - j, color);
                        }
                    }

                    /*
                     for (i=0, ilen=WIDTH; i<ilen; i++) {
                     for (j=0, jlen=randChoice([randInt(0, 8), randInt(5, 9)]); j<jlen; j++) {
                     if (!color || !randInt(0, 3)) color = randChoice(blockTypes);
                     start.push([i, HEIGHT - j, color]);
                     }
                     }

                     if( options.showFieldOnStart ) {
                     drawBackground();
                     for (i=0, ilen=start.length; i<ilen; i++) {
                     drawBlock.apply(drawBlock, start[i]);
                     }
                     }
                     */

                },

                /**
                 * Renders
                 */
                render: function (ctx, $shape) {
                    //console.log('render');
                    if ( 'preview' === ctx ) {
                        ctx = game._previewCtx;
                    } else {
                        ctx = game._ctx;
                    }
                    ctx.clearRect(0, 0, game._PIXEL_WIDTH, game._PIXEL_HEIGHT);
                    game._drawBackground(ctx);
                    //console.log('this.cur');
                    //console.log(this.cur);
                    //console.log('this.next');
                    //console.log(this.next);
                    if ( JSON.stringify(ctx) === JSON.stringify(game._ctx) ) {
                        game._gameFilled.draw();
                        this.cur.draw(false);
                    } else {
                        game._previewFilled.draw();
                        this.next.preview();
                    }
                }
            };

            game._niceShapes = game._getNiceShapes();
        },

        /** UTILITY FUNCTIONS **/
        /**
         * Gets random integer between two numbers.
         * @param {int} a Min number.
         * @param {int} b Max number.
         * @returns {int} Random number.
         * @private
         */
        _randInt: function (a, b) {
            return a + Math.floor(Math.random() * (1 + b - a));
        },

        /**
         * Random positive(1)/negative(0) sign.
         *
         * @returns {number} Random positive(1)/negative(0).
         * @private
         */
        _randSign: function () {
            return this._randInt(0, 1) * 2 - 1;
        },

        /**
         * Randomized choice selected between choices.
         *
         * @param {array} choices Array of choices.
         * @returns {*} Selected array element.
         * @private
         */
        _randChoice: function (choices) {
            return choices[this._randInt(0, choices.length - 1)];
        },

        /**
         * Find base64 encoded images and load them as image objects, which can be used by the canvas renderer
         * @private
         */
        _preloadThemeAssets: function () {

            var base64check = new RegExp('^data:image/(png|gif|jpg);base64,', 'i');

            if (typeof this._theme.blocks !== 'undefined') {
                var keys = Object.keys(this._theme.blocks);

                // Load the blocks
                for (var i = 0; i < keys.length; i++) {
                    this._theme.blocks[keys[i]]
                    if (typeof this._theme.blocks[keys[i]] === 'string') {
                        if (base64check.test(this._theme.blocks[keys[i]])) {
                            var base64src = this._theme.blocks[keys[i]];
                            this._theme.blocks[keys[i]] = new Image();
                            this._theme.blocks[keys[i]].src = base64src;
                        }
                    }
                }
            }

            // Load the bg
            if (typeof this._theme.backgroundGrid !== 'undefined') {
                if (typeof this._theme.backgroundGrid === 'string') {
                    if (base64check.test(this._theme.backgroundGrid)) {
                        var base64src = this._theme.backgroundGrid;
                        this._theme.backgroundGrid = new Image();
                        this._theme.backgroundGrid.src = base64src;
                    }
                }
            }

        },

        /**
         * Creates game holder & sets game canvas/2dcontext.
         * @private
         */
        _createHolder: function () {

            // Create the main holder (it holds all the ui elements, the original element is just the wrapper)
            this._$gameholder = $('<div class="blockrain-game-holder"></div>');
            this._$gameholder.css('position', 'relative').css('width', '100%').css('height', '100%');

            this.element.html('').append(this._$gameholder);

            // Create the game canvas and context
            this._$canvas = $('<canvas id="game-canvas" style="display:block; width:100%; height:100%; padding:0; margin:0; border:none;" />');
            if (typeof this._theme.background === 'string') {
                this._$canvas.css('background-color', this._theme.background);
            }
            this._$gameholder.append(this._$canvas);

            this._canvas = this._$canvas.get(0);
            this._ctx = this._canvas.getContext('2d');

        },

        /**
         * Creates the game UI.
         *      -score UI
         *      -preview UI
         *      -start UI
         *      -game over UI
         *
         * @private
         */
        _createUI: function () {

            var game = this;

            // Score
            game._$score = $(
                '<div class="blockrain-score-holder" style="position:absolute;">' +
                '<div class="blockrain-score">' +
                '<div class="blockrain-score-msg">' + this.options.scoreText + '</div>' +
                '<div class="blockrain-score-num">0</div>' +
                '</div>' +
                '</div>').hide();
            game._$scoreText = game._$score.find('.blockrain-score-num');
            game._$gameholder.append(game._$score);

            // Preview
            if (!game.options.noPreview) {
                game._$previewholder = game.options.previewSelector ? $(game.options.previewSelector) : game._$gameholder;
                game._$preview = $(
                    '<div class="blockrain-preview-holder" style="position:absolute;">' +
                    '<div class="blockrain-preview">' +
                    '<div class="blockrain-preview-msg">' + this.options.previewText + '</div>' +
                    '<div class="blockrain-preview-shape"></div>' +
                    '</div>' +
                    '</div>');
                //.hide();
                game._$previewShape = game._$preview.find('.blockrain-preview-shape');
                game._$previewCanvas = game._$preview.find('.blockrain-preview-shape');

                // Preview Canvas
                //try using document.createElement('canvas'); to set the size
                //The width attribute defaults to 300, and the height attribute defaults to 150.
                //http://www.w3.org/TR/2012/WD-html5-author-20120329/the-canvas-element.html#the-canvas-element
                //http://stackoverflow.com/questions/7792788/canvas-default-size
                //canvas.width = div.clientWidth;
                //canvas.height = div.clientHeight;
                game._$previewCanvas = document.createElement('canvas');
                game._$previewCanvas.width = 70; // square = 50; line = 25; other = 70;
                game._$previewCanvas.height = 100;

                game._$previewCanvas = $(game._$previewCanvas)
                    .css({
                        'display': 'block',
                        'padding': '10px 17.5px'
                    });
                //game._$previewCanvas = $('<canvas id="preview-canvas" style="display:block; width:100%; height:100%; padding:0; margin:0; border:0;" />');
                if (typeof game._theme.background === 'string') {
                    game._$previewCanvas.css('background-color', this._theme.background);
                }
                game._$previewShape.append(game._$previewCanvas);

                game._previewCanvas = game._$previewCanvas.get(0);
                game._previewCtx = game._previewCanvas.getContext('2d');

                // Add the preview area
                game._$previewholder.append(game._$preview);
            }

            // Create the start menu
            game._$start = $(
                '<div class="blockrain-start-holder" style="position:absolute;">' +
                '<div class="blockrain-start">' +
                '<div class="blockrain-start-msg">' + this.options.playText + '</div>' +
                '<a class="blockrain-btn blockrain-start-btn">' + this.options.playButtonText + '</a>' +
                '</div>' +
                '</div>').hide();
            game._$gameholder.append(game._$start);

            game._$start.find('.blockrain-start-btn').click(function (event) {
                event.preventDefault();
                game.start();
            });

            // Create the game over menu
            game._$gameover = $(
                '<div class="blockrain-game-over-holder" style="position:absolute;">' +
                '<div class="blockrain-game-over">' +
                '<div class="blockrain-game-over-msg">' + this.options.gameOverText + '</div>' +
                '<a class="blockrain-btn blockrain-game-over-btn">' + this.options.restartButtonText + '</a>' +
                '</div>' +
                '</div>').hide();
            game._$gameover.find('.blockrain-game-over-btn').click(function (event) {
                event.preventDefault();
                game.restart();
            });
            game._$gameholder.append(game._$gameover);

        },

        /**
         * Refreshes block sizes based on element width.
         * @private
         */
        _refreshBlockSizes: function () {

            if (this.options.autoBlockWidth) {
                this.options.blockWidth = Math.ceil(this.element.width() / this.options.autoBlockSize);
            }

        },

        /**
         * Gets the nice shapes??
         *
         * @todo Determine what this function does.
         * @todo Things I need for this to work...
         * @todo     - ability to test each shape with this._gameFilled data
         * @todo     - maybe give empty spots scores? and try to maximize the score?
         *
         * @returns {Function}
         * @private
         */
        _getNiceShapes: function () {

            var game = this;

            var shapes = {},
                attr;

            for (var attr in this._shapeFactory) {
                shapes[attr] = this._shapeFactory[attr]();
            }

            function scoreBlocks(possibles, blocks, x, y, filled, width, height) {
                var i, len = blocks.length, score = 0, bottoms = {}, tx, ty, overlaps;

                // base score
                for (i = 0; i < len; i += 2) {
                    score += possibles[game._gameFilled.asIndex(x + blocks[i], y + blocks[i + 1])] || 0;
                }

                // overlap score -- //TODO - don't count overlaps if cleared?
                for (i = 0; i < len; i += 2) {
                    tx = blocks[i];
                    ty = blocks[i + 1];
                    if (bottoms[tx] === undefined || bottoms[tx] < ty) {
                        bottoms[tx] = ty;
                    }
                }
                overlaps = 0;
                for (tx in bottoms) {
                    tx = parseInt(tx);
                    for (ty = bottoms[tx] + 1, i = 0; y + ty < height; ty++, i++) {
                        if (!game._gameFilled.check(x + tx, y + ty)) {
                            overlaps += i == 0 ? 2 : 1; //TODO-score better
                            //if (i == 0) overlaps += 1;
                            break;
                        }
                    }
                }

                score = score - overlaps;

                return score;
            }

            function resetShapes() {
                for (var attr in shapes) {
                    shapes[attr].x = 0;
                    shapes[attr].y = -1;
                }
            }

            //TODO -- evil mode needs to realize that overlap is bad...
            var func = function (filled, checkCollisions, width, height, mode, _one_shape) {
                if (!_one_shape) resetShapes();

                var possibles = new Array(width * height),
                    evil = mode == 'evil',
                    x, y, py,
                    attr, shape, i, blocks, bounds,
                    score, best_shape, best_score = (evil ? 1 : -1) * 999, best_orientation, best_x,
                    best_score_for_shape, best_orientation_for_shape, best_x_for_shape;

                for (x = 0; x < width; x++) {
                    for (y = 0; y <= height; y++) {
                        if (y == height || filled.check(x, y)) {
                            for (py = y - 4; py < y; py++) {
                                possibles[filled.asIndex(x, py)] = py; //TODO - figure out better scoring?
                            }
                            break;
                        }
                    }
                }

                // for each shape...
                var opts = _one_shape === undefined ? shapes : {cur: _one_shape}; //BOO
                for (attr in opts) { //TODO - check in random order to prevent later shapes from winning
                    shape = opts[attr];
                    best_score_for_shape = -999;

                    // for each orientation...
                    for (i = 0; i < (shape.symmetrical ? 2 : 4); i++) { //TODO - only look at unique orientations
                        blocks = shape.getBlocks(i);
                        bounds = shape.getBounds(blocks);

                        // try each possible position...
                        for (x = -bounds.left; x < width - bounds.width; x++) {
                            for (y = -1; y < height - bounds.bottom; y++) {
                                if (game._checkCollisions(x, y + 1, blocks, true)) {
                                    // collision
                                    score = scoreBlocks(possibles, blocks, x, y, filled, width, height);
                                    if (score > best_score_for_shape) {
                                        best_score_for_shape = score;
                                        best_orientation_for_shape = i;
                                        best_x_for_shape = x;
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    if ((evil && best_score_for_shape < best_score) ||
                        (!evil && best_score_for_shape > best_score)) {
                        best_shape = shape;
                        best_score = best_score_for_shape;
                        best_orientation = best_orientation_for_shape;
                        best_x = best_x_for_shape;
                    }
                }

                best_shape.best_orientation = best_orientation;
                best_shape.best_x = best_x;

                return best_shape;
            };

            //func.no_preview = game.options.noPreview = true;
            return func;
        },

        /**
         * Get random object key from Shape Factory object.
         *
         * @returns {string} Randomly selected Block Type.
         * @private
         */
        _getRandom: function () {
            var result, count = 0;
            for (var prop in this._shapeFactory)
                if (Math.random() < 1 / ++count)
                    result = prop;
            return result;
        },

        /**
         * Returns random shape from Shape Factory object.
         * @returns {Shape} Random shape from Shape Factory object.
         * @private
         */
        _randomShapes: function () {
            var k = this._getRandom();
            return this._shapeFactory[k];
        },

        /**
         * Game Key & Touch Controls.
         * @param enable
         * @private
         */
        _setupControls: function (enable) {

            var game = this,
                touch = isTouchEnabled(),
                touchEvents = ['swiperight', 'swipeleft', 'swipedown', 'tapone', 'taptwo', 'tapthree', 'rotatecw', 'rotateccw'],

                // Use event namespacing so we don't ruin other keypress events
                keyEvents = ['keypress.blockrain', 'keydown.blockrain', 'keyup.blockrain'];

            /**
             * Handler: These are used to be able to bind/unbind controls.
             * If key unsupported, calls onKeyPress.
             * @param evt
             * @returns {boolean}
             */
            var handleKeyPress = function (evt) {
                var caught = false;
                if (game._board.cur) {
                    caught = true;
                    if (game.options.asdwKeys) {
                        switch (evt.keyCode) {
                            case 65: /*a*/
                                game._board.cur.moveLeft();
                                break;
                            case 87: /*w*/
                                game._board.cur.rotate(true);
                                break;
                            case 68: /*d*/
                                game._board.cur.moveRight();
                                break;
                            case 83: /*s*/
                                game._board.dropCount = game._board.dropDelay;
                                break;
                        }
                    }
                    switch (evt.keyCode) {
                        case 37: /*left*/
                            game._board.cur.moveLeft();
                            break;
                        case 38: /*up*/
                            game._board.cur.rotate(true);
                            break;
                        case 39: /*right*/
                            game._board.cur.moveRight();
                            break;
                        case 40: /*down*/
                            game._board.dropCount = game._board.dropDelay;
                            break;
                        case 88: /*x*/
                            game._board.cur.rotate(true);
                            break;
                        case 90: /*z*/
                            game._board.cur.rotate(false);
                            break;
                        default:
                            caught = game.options.onKeyPress.call(this.element, evt) || false;
                            break;
                    }
                }
                if (caught) {
                    evt.preventDefault();
                }
                return !caught;
            }

            /**
             * Determines whether touch is enabled.
             * @returns {boolean}
             */
            function isTouchEnabled() {
                if (('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0) ||
                    (navigator.msMaxTouchPoints > 0) ||
                    (window.DocumentTouch && document instanceof DocumentTouch)) {
                    return true;
                }
                return false;
            }

            /**
             * Determines whether key pressed is a stop key & calls event.preventDefault().
             * Keys: up, down, left, right
             * @param {Event} evt Event object.
             * @returns {bool} Whether a specific key was pressed.
             */
            function isStopKey(evt) {
                var cfg = {
                    stopKeys: game.options.stopKeys || {37: 1, 38: 1, 39: 1, 40: 1}
                };

                // @todo maybe extend cfg with game.options.moreStopKeys??
                var isStop = (cfg.stopKeys[evt.keyCode] || (cfg.moreStopKeys && cfg.moreStopKeys[evt.keyCode]));
                if (isStop) {
                    evt.preventDefault();
                }
                return isStop;
            }

            /**
             * Gets the key pressed with a prefix 'safekeypress.'
             * @param {Event} evt Event object.
             * @returns {string} Key prefixed name.
             */
            function getKey(evt) {
                return 'safekeypress.' + evt.keyCode;
            }

            /**
             * Conditionally calls the Key Press handler based on key value.
             * @param {Event} evt Event object.
             * @returns {boolean}
             */
            function keypress(evt) {
                var key = getKey(evt),
                    val = ($.data(this, key) || 0) + 1;
                $.data(this, key, val);
                if (val > 0) {
                    return handleKeyPress.call(this, evt);
                }
                return isStopKey(evt);
            }

            /**
             * Gets key & calls Key Press handler.
             * @param {Event} evt Event object.
             * @returns
             */
            function keydown(evt) {
                var key = getKey(evt);
                $.data(this, key, ($.data(this, key) || 0) - 1);
                return handleKeyPress.call(this, evt);
            }

            /**
             * Gets key up value.
             * @param evt
             * @returns {boolean}
             */
            function keyup(evt) {
                $.data(this, getKey(evt), 0);
                return isStopKey(evt);
            }

            /**
             * Binds touch & key events to document
             * @todo orientationchange
             * @param {string} type Type of event to bind ('touch' or 'key')
             */
            function bind(type) {
                if ('touch' === type || touch) {
                    $(document)
                        .bind('swiperight', game._board.cur.moveRight)
                        .bind('swipeleft', game._board.cur.moveLeft)
                        .bind('swipedown', function(tEvent){ game._board.dropCount = game._board.dropDelay; })
                        .bind('tapone', function(tEvent){ game._board.cur.rotate(true); })
                        .bind('taptwo', function(tEvent){ game._board.cur.rotate(true); game._board.cur.rotate(true); })
                        .bind('tapthree', function(tEvent){ game._board.cur.rotate(false); })
                        .bind('rotatecw', function(tEvent){ game._board.cur.rotate(true); })
                        .bind('rotateccw', function(tEvent){ game._board.cur.rotate(false); });
                } else {
                    $(document)
                        .bind('keypress.blockrain', keypress)
                        .bind('keydown.blockrain', keydown)
                        .bind('keyup.blockrain', keyup);
                }
            }

            /**
             * Unbinds touch & key events to document
             * @todo orientationchange
             * @param {string} type Type of event to bind ('touch' or 'key')
             */
            function unbind(type) {
                var i;
                if ('touch' === type || touch) {
                    for(; i <= touchEvents.length; i++) {
                        $(document).unbind(touchEvents[i]);
                    }
                } else {
                    for(; i <= keyEvents.length; i++) {
                        $(document).unbind(keyEvents[i]);
                    }
                    //$(document).unbind('keypress.blockrain').unbind('keydown.blockrain').unbind('keyup.blockrain');
                }
            }

            // Unbind everything by default
            unbind();

            if (!game.options.autoplay) {
                if (enable) {
                    bind();
                }
            }
        }

    });
})(jQuery));