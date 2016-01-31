// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or any plugin's vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery
//= require jquery_ujs
//= require bootstrap.min
// require turbolinks
//= require lodash.min
//= require_tree .

(function(){
  'use strict';
  window.onload = function() {
    var BigEarth = {
      init: function(){
        $('.btc, .usd').click(function(evt){
          if($(evt.currentTarget).hasClass('btc')) {
            $('.btc').addClass('hide')
            $('.usd').removeClass('hide')
          } else if($(evt.currentTarget).hasClass('usd')) {
            $('.usd').addClass('hide')
            $('.btc').removeClass('hide')
          }
        });
      }
    };

    var BookmarkBtn = {
      init: function(){
        var bookmarks = JSON.parse(localStorage.getItem('bookmarks'));
        var bookmark = _.find(bookmarks, function(bookmark) { 
          return bookmark.path === window.location.pathname; 
        });

        if(bookmark) {
          $('.bookmark').text('Bookmarked').attr('href', '/apps/bookmarks');
        }

        $('.bookmark').click(function(evt) {
          if($(evt.currentTarget).text() != 'Bookmarked') {
            BookmarkBtn.set_bookmark(evt);
            evt.preventDefault();
          }
        });
      },
      set_bookmark: function(evt) {
        var bookmarks = localStorage.getItem('bookmarks');
        if(bookmarks === null) {
          bookmarks = [];
        } else {
          bookmarks = JSON.parse(bookmarks);
        }
        var bookmark = _.find(bookmarks, function(bookmark) { 
          return bookmark.path === window.location.pathname; 
        });
        if(_.isUndefined(bookmark)) {
          bookmarks.push({
            path: window.location.pathname,
            created_at: Date.now(),
            id: $(evt.currentTarget).data('page_id'), 
            bookmark_type: $(evt.currentTarget).data('bookmark_type')
          });
          $('.bookmark').text('Bookmarked').attr('href', '/apps/bookmarks');
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
      }
    };
    var Bookmarks = {
      init: function() {
        // grab marshalled bookmarks from localStorage
        var bookmarks = localStorage.getItem('bookmarks');
        
        // parse marshalled bookmarks into JSON
        var parsed_bookmarks = JSON.parse(bookmarks);
        
        ['block', 'transaction', 'address'].forEach(function(item, index) {
          // for all 3 bookmark types filter out respective bookmarks
          var bkmrks = _.filter(parsed_bookmarks, function(bkmrk) {
            return bkmrk.bookmark_type === item;
          });
        
          // build DOM of any bookmarks which exist for respective bookmark_type 
          if(!_.isEmpty(bkmrks)) {
            Bookmarks.build_bookmarks(bkmrks);
          }
        });
        
        // init click events
        $('.delete_bookmark').click(function(evt) {
          Bookmarks.delete_bookmark(evt);
        });
        $('.clear_all_bookmarks').click(function(evt) {
          Bookmarks.clear_all_bookmarks();
          evt.preventDefault();
        });
      },
      build_bookmarks: function(bookmarks) {
        if(!_.isEmpty(bookmarks)) {
          $('#' + bookmarks[0].bookmark_type + '_bookmarks p').hide()
          $('#' + bookmarks[0].bookmark_type + '_bookmarks ul').removeClass('hide');
          _.each(bookmarks, function(bookmark, index) {
            $('#' + bookmark.bookmark_type + '_bookmarks ul').append($('<li class="list-group-item">' + 
            '<a class="bookmark_path" href="' + bookmark.path + '">' + _.truncate(bookmark.id, {length: 45}) + '</a>' + 
            '<span class="address_balance text-success pull-right" data-id="' + bookmark.id + '">balance</span>' + 
            '<a href="#" class="delete_bookmark">' + 
              '<span class="label label-danger pull-right" data-id="' + bookmark.id + '">Delete</span>' + 
            '</a></li>'))
            if(bookmark.bookmark_type === 'address') {
              var $sum_footer = $('#sum_btc').closest('.panel-footer');
              if($sum_footer.is(':hidden')) {
                $sum_footer.removeClass('hide');
              }
              Bookmarks.fetch_address(bookmark.id);
            }
          });
        }
      },
      fetch_address: function(address){
        $.getJSON('/addresses/' + address + '.json', function(data) {
          Bookmarks.calculate_address_total(data.data, 'add');
        });
      },
      calculate_address_total: function(data, operation_type) {
        var new_balance = parseFloat(data.balance);
        $($('[data-id="' + data.address + '"]')[0]).attr('data-balance', new_balance.toFixed(8));
        var $sum = $('#sum_btc'),
            $sum_usd = $('#sum_usd'),
            $sum_footer = $sum.closest('.panel-footer'),
            $sum_li = $sum.closest('.panel').find('.panel-body li');
        var existing_total = parseFloat(_.trimEnd($sum.text(), ' BTC'));
        var new_total;
        if(operation_type === 'add') {
          new_total = existing_total + new_balance;
        } else if (operation_type === 'subtract') {
          new_total = existing_total - new_balance;
        }
        var usd_exchange_rate = $('body').data('value');
        var new_usd = _.round(new_total * usd_exchange_rate, 2);
        var split_btc = new_total.toFixed(8).toString().split('.');
        split_btc[0] = Utility.number_with_commas(split_btc[0]);
        var formatted_btc = split_btc.join('.');
        $sum.text(formatted_btc + ' BTC').attr('title', '$' + new_usd.toLocaleString());
        $sum_usd.text('$' + new_usd.toLocaleString()).attr('title', formatted_btc + ' BTC');
        $($sum.closest('.pull-right')[0]).attr('title', new_total.toLocaleString());
        if(!$sum_li.length && $sum_footer.is(':visible')) {
          Bookmarks.hide_sum();
        }
      },
      hide_sum: function($sum) {
          $('#address_bookmarks .panel-footer').hide();
      },
      delete_bookmark: function(evt){
        var bkmks = JSON.parse(localStorage.getItem('bookmarks'));
        var balance = $($($(evt.currentTarget)[0]).find('span')[0]).data('balance');
        var address = $($($(evt.currentTarget)[0]).find('span')[0]).data('id');
        var new_bkmks = _.reject(bkmks, function(bk) {
          return bk.path == $(evt.currentTarget).parents('.list-group-item').find('.bookmark_path').attr('href');
        });
        var parent_ul = $(evt.currentTarget).closest('.list-group');
        $(evt.currentTarget).parents('.list-group-item').remove();
        if(!$(parent_ul).children('li').length) {
          $(parent_ul).closest('.panel-body').find('ul').hide().end().find('p').show();
        }
        
        if(!_.isUndefined(balance)) {
          Bookmarks.calculate_address_total({
            balance: balance,
            address: address
          }, 'subtract');
        }
        localStorage.setItem('bookmarks', JSON.stringify(new_bkmks));
        evt.preventDefault();
        
      },
      clear_all_bookmarks: function(){
        localStorage.removeItem('bookmarks');
        $('#block_bookmarks ul, #transaction_bookmarks ul, #address_bookmarks ul').hide()
        $('#block_bookmarks li, #transaction_bookmarks li, #address_bookmarks li').remove()
        $('#block_bookmarks p, #transaction_bookmarks p, #address_bookmarks p').show()
        Bookmarks.hide_sum();
      }
    };
    var Utility = {
      number_with_commas: function(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
    };
    BigEarth.init();
    BookmarkBtn.init();
    if($('#block_bookmarks').length) {
      Bookmarks.init();
    }
  };
}());
