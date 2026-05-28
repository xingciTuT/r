// I18N — Chinese / English
const I18N = {
  zh: {
    nav_brand:    '资源库',
    nav_theme:    '切换主题',
    nav_lang:     '切换到英文',
    nav_admin:    '管理',
    hero_label:   '索引',
    hero_title:   '收藏',
    search_ph:    '搜索…',
    filter_all:   '全部',
    filter_tools: '工具',
    filter_library: '框架 / 库',
    filter_article:'文章',
    filter_video:  '视频',
    filter_course: '课程',
    filter_other:  '其他',
    count_text:    '个资源',
    empty_text:    '没有找到匹配的资源。',
    footer_line1:  '精心筛选 · 持续更新',
    meta_url:      '', // url just shown as-is
  },
  en: {
    nav_brand:    'Resource Hub',
    nav_theme:    'Toggle theme',
    nav_lang:     'Switch to Chinese',
    nav_admin:    'Admin',
    hero_label:   'Index',
    hero_title:   'Collections',
    search_ph:    'Search…',
    filter_all:   'All',
    filter_tools: 'Tools',
    filter_library: 'Libraries',
    filter_article:'Articles',
    filter_video:  'Videos',
    filter_course: 'Courses',
    filter_other:  'Other',
    count_text:    'resources',
    empty_text:    'No resources matched your criteria.',
    footer_line1:  'Curated by hand · Always up to date',
    meta_url:      '',
  }
};

// Category label helper  (zh / en)
const CAT_LABELS = {
  tools:   { zh: '工具',   en: 'Tools'   },
  library: { zh: '库',     en: 'Library' },
  article: { zh: '文章',   en: 'Article' },
  video:   { zh: '视频',   en: 'Video'   },
  course:  { zh: '课程',   en: 'Course'  },
  other:   { zh: '其他',   en: 'Other'   },
};

function t(key) {
  return I18N[state.lang]?.[key] ?? I18N['en']?.[key] ?? key;
}

function catLabel(cat) {
  return CAT_LABELS[cat]?.[state.lang] ?? cat;
}