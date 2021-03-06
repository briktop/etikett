;(function($, undefined) {
  var tagTemplate = _.template([
    "<span class='etikett-tag'>",
      "<%= tag %>",
      "<span class='etikett-remove'></span>",
    "</span>"
  ].join(''));
  var etikettTemplate = _.template([
    "<input class='etikett-input'/>",
    "<input class='etikett-keytrap' style='width:0px;opacity:0;border:none'/>"
  ].join(' '));

  var TagView = Backbone.View.extend({
    events: {
      "click .etikett-remove": "clickRemove",
      "keydown input.etikett-input": "inputChange",
      "keyup input.etikett-input": "autosizeInput",
      "focus input.etikett-input": "clearSelection",
      "blur input.etikett-input": "addCurrentValueAsTag",
      "click .etikett-tag": "clickTag",
      "keydown .etikett-keytrap": "trapCatch",
      "click": "clickBox"
    },
    className: 'etikett',

    initialize: function() {
      _.bindAll(this, 'render', 'addTag', 'inputChange', 'removeTag', 
        'trapCatch', 'selectTag', 'deselectTag', 'clearSelection', 'clickBox',
        'addTagString', 'addCurrentValueAsTag');
      this.selected = new Backbone.Collection();
      this.listenTo(this.collection, 'add', this.addTag);
      this.listenTo(this.collection, 'remove', this.removeTag);
      this.listenTo(this.selected, 'add', this.selectTag);
      this.listenTo(this.selected, 'remove', this.deselectTag);
    },

    render: function() {
      this.$el.html(etikettTemplate({}));
      this.collection.each(this.addTag);
      return this;
    },

    clickBox: function(event) {
      if (!$(event.target).is(this.$el)) return;
      this.$('.etikett-input').focus();
    },

    autosizeInput: function(event) {
      var input = $(event.target);
      var dummy = $('<span/>')
        .css({ 
          font: input.css('font'), 
          'text-transform': input.css('text-transform'),
          display: 'none' 
        })
        .text(input.val());
      this.$el.append(dummy);
      input.width(dummy.width() + 35);
      dummy.remove();
    },

    addTagString: function(tagText) {
      var self = this;
      var tags = tagText.split(',');
      _.each(tags, function(tag) {
        var tagObject = {};
        tagObject[self.options.key] = tag.trim();
        self.collection.add(new Backbone.Model(tagObject));
      });
    },

    addCurrentValueAsTag: function() {
      var input = this.$('.etikett-input');
      var tagName = input.val().trim();
      if (!tagName) return;
      this.addTagString(tagName);
      input.val('');
    },

    inputChange: function(event) {
      var input = $(event.target);

      // Finished tag (comma or enter)
      if (~[13,188].indexOf(event.keyCode)) {
        event.preventDefault();
        this.addCurrentValueAsTag();
      // Backspace in empty input (backspace or delete)
      } else if (~[8,46].indexOf(event.keyCode) && !input.val()) {
        event.preventDefault();
        var lastTag = this.$('.etikett-tag:last');
        if (!lastTag.length) return;
        var tag = lastTag.data('model');
        input.val(tag.get(this.options.key));
        this.collection.remove(tag);
      }
    },

    trapCatch: function(event) {
      if (!~[8,46].indexOf(event.keyCode)) return;
      if (!this.selected.length) return;
      this.deleteSelection();
    },

    deleteSelection: function() {
      var self = this;
      this.selected.each(function(tag) {
        self.collection.remove(tag);
        self.selected.remove(tag);
      });
    },

    clearSelection: function(event) {
      var self = this;
      this.selected.each(function(tag) { self.selected.remove(tag) });
    },

    selectTag: function(tag) {
      $("[data-cid=" + tag.cid + "]").addClass('etikett-selected');
    },

    deselectTag: function(tag) {
      $("[data-cid=" + tag.cid + "]").removeClass('etikett-selected');
    },

    addTag: function(tag) {
      var tagData = tag.toJSON();
      tagData.tag = tagData[this.options.key];
      var tagEl = $(tagTemplate(tagData))
        .data({model:tag})
        .attr('data-cid', tag.cid);
      var lastTag = this.$('.etikett-tag:last');
      if (!lastTag.length) this.$el.prepend(tagEl);
      else this.$('.etikett-tag:last').after(tagEl);
      tagEl.before(" ");
    },

    clickRemove: function(event) {
      event.preventDefault();
      var tagEl = $(event.target).parents('.etikett-tag');
      this.collection.remove(tagEl.data('model'));
    },

    isSelected: function(model) {
      return this.selected.find(function(tag) { return tag.cid == model.cid });
    },

    clickTag: function(event) {
      var target = $(event.target);
      if (target.is('.etikett-remove')) return;

      var model = target.data('model');
      this.$('.etikett-keytrap').focus();
      if (!this.isSelected(model)) {
        if (!this.ctrlKey) this.clearSelection();
        this.selected.add(model);
      } else {
        this.selected.remove(model);
      }
    },

    removeTag: function(tag) {
      var tagEl = $("[data-cid=" + tag.cid + "]").remove();
    }
  });

  $.fn.etikett = function(options) {
    var self = $(this);
    if (self.length > 1) return self.each($.fn.etikett);
    else if (!self.length) return;

    if (self.data('etikett')) return self.data('etikett');

    if (!options) options = {};

    options.key = options.key || 'tag';

    var tags = options.tags || new Backbone.Collection();
    var view = new TagView({collection: tags, key: options.key });
    self.append(view.render().$el);

    var etikett = {
      view: view,
      tags: tags,
      get: function() {
        return tags.toJSON();
      },
      set: function(value) {
        if (_.isEqual(value, etikett.get())) return;
        value = $.map(value, function(val) {
          return new Backbone.Model(val);
        });
        return tags.set(value).toJSON();
      }
    };

    self.data('etikett', etikett);
    self.each(function() { this.type = 'etikett' });

    return etikett;
  };
})(jQuery);
