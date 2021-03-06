var TextGrabber = require('../src/text-grabber').TextGrabber;
var Eventer = require('../src/eventer').Eventer;

describe('TextGrabber', function() {
  describe('general behaviour', function() {
    var tg;
    beforeEach(function() {
      tg = new TextGrabber();
    });

    describe('impermanent', function() {
      it('should add text when impermanent', function() {
        tg.write({ event:"impermanent", text:"abc" });
        expect(tg.getPlainText()).toEqual("abc");
      });

      it('should not add nnewline after current line inserted following impermanent', function() {
        tg.write({ event:"impermanent", text:"abc" });
        expect(tg.getPlainText()[3]).toBeUndefined();
      });
    });

    describe('permanent', function() {
      it('should add text when permanent', function() {
        tg.write({ event:"permanent", text:"abc" });
        expect(tg.getPlainText()).toEqual("abc\n");
      });

      it('should add nnewline after permanent', function() {
        tg.write({ event:"permanent", text:"abc" });
        expect(tg.getPlainText().substring(3)).toEqual("\n");
      });
    });

    describe('sequence of inputs', function() {
      it('should add multiple permanents', function() {
        tg.write({ event:"permanent", text:"abc" });
        tg.write({ event:"permanent", text:"def" });
        expect(tg.getPlainText()).toEqual("abc\ndef\n");
      });

      it('should include an impermanent with permanent text', function() {
        tg.write({ event:"permanent", text:"abc" });
        tg.write({ event:"permanent", text:"def" });
        tg.write({ event:"impermanent", text:"ghi" });
        expect(tg.getPlainText()).toEqual("abc\ndef\nghi");
      });

      it('should clear out current line on submission', function() {
        tg.write({ event:"permanent", text:"abc" });
        tg.write({ event:"impermanent", text:"ghi" });
        expect(tg.getPlainText()).toEqual("abc\nghi");
        tg.write({ event:"permanent", text:"def" });
        expect(tg.getPlainText()).toEqual("abc\ndef\n");
      });
    });

   describe('getCategorisedText', function() {
      it('should categorise impermanent text', function() {
        tg.write({ event:"impermanent", text:"abc", io:"input" });
        expect(tg.getCategorisedText()[0]).toEqual({ text: "abc", io: "input"});
      });

      it('should categorise permanent text', function() {
        tg.write({ event:"permanent", text:"abc", io:"input" });
        expect(tg.getCategorisedText()[0]).toEqual({ text: "abc\n", io: "input"});
      });

    });
  });
});
