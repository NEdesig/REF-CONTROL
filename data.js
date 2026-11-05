/* =====================================================
   REF CONTROL — DATA
   Кубок России U16
===================================================== */

(() => {
  "use strict";

  const FIRST_NAMES = [
    "Александр", "Алексей", "Андрей", "Антон", "Артём",
    "Богдан", "Вадим", "Валерий", "Василий", "Виктор",
    "Владимир", "Владислав", "Георгий", "Даниил", "Денис",
    "Дмитрий", "Евгений", "Егор", "Иван", "Игорь",
    "Илья", "Кирилл", "Константин", "Лев", "Максим",
    "Марк", "Матвей", "Михаил", "Никита", "Николай",
    "Олег", "Павел", "Роман", "Руслан", "Савелий",
    "Семён", "Сергей", "Тимофей", "Фёдор", "Ярослав"
  ];

  const LAST_NAMES = [
    "Абрамов", "Агапов", "Алексеев", "Андреев", "Антонов",
    "Архипов", "Баранов", "Белов", "Беляев", "Блинов",
    "Борисов", "Быков", "Васильев", "Виноградов", "Власов",
    "Волков", "Воробьёв", "Гаврилов", "Галкин", "Герасимов",
    "Голубев", "Горбунов", "Григорьев", "Давыдов", "Данилов",
    "Демидов", "Денисов", "Дмитриев", "Дорофеев", "Егоров",
    "Елисеев", "Ершов", "Жданов", "Жуков", "Зайцев",
    "Захаров", "Зимин", "Зиновьев", "Иванов", "Игнатьев",
    "Ильин", "Казаков", "Калинин", "Карпов", "Кириллов",
    "Киселёв", "Князев", "Ковалёв", "Козлов", "Колесников",
    "Комаров", "Кондратьев", "Коновалов", "Королёв", "Котов",
    "Крылов", "Кузнецов", "Куликов", "Лазарев", "Лебедев",
    "Логинов", "Макаров", "Максимов", "Мартынов", "Маслов",
    "Матвеев", "Медведев", "Мельников", "Миронов", "Михайлов",
    "Морозов", "Муравьёв", "Назаров", "Никитин", "Новиков",
    "Орлов", "Осипов", "Павлов", "Панин", "Петров",
    "Поляков", "Попов", "Потапов", "Романов", "Рыбаков",
    "Савельев", "Сазонов", "Семенов", "Сергеев", "Сидоров",
    "Смирнов", "Соболев", "Соколов", "Соловьёв", "Сорокин",
    "Степанов", "Тарасов", "Тимофеев", "Титов", "Тихонов",
    "Фёдоров", "Филиппов", "Фомин", "Фролов", "Харитонов",
    "Хохлов", "Цветков", "Чернов", "Шаповалов", "Шестаков",
    "Шилов", "Щербаков", "Юдин", "Яковлев"
  ];

  const REGIONS = [
    { region: "Республика Татарстан", cities: ["Казань", "Набережные Челны", "Альметьевск", "Нижнекамск"] },
    { region: "Москва", cities: ["Москва"] },
    { region: "Московская область", cities: ["Балашиха", "Мытищи", "Подольск", "Химки"] },
    { region: "Санкт-Петербург", cities: ["Санкт-Петербург"] },
    { region: "Ленинградская область", cities: ["Всеволожск", "Гатчина"] },
    { region: "Республика Башкортостан", cities: ["Уфа", "Стерлитамак", "Нефтекамск"] },
    { region: "Свердловская область", cities: ["Екатеринбург", "Нижний Тагил", "Первоуральск"] },
    { region: "Челябинская область", cities: ["Челябинск", "Магнитогорск", "Златоуст"] },
    { region: "Нижегородская область", cities: ["Нижний Новгород", "Дзержинск"] },
    { region: "Ярославская область", cities: ["Ярославль", "Рыбинск"] },
    { region: "Омская область", cities: ["Омск"] },
    { region: "Новосибирская область", cities: ["Новосибирск", "Бердск"] },
    { region: "Самарская область", cities: ["Самара", "Тольятти"] },
    { region: "Тульская область", cities: ["Тула", "Новомосковск"] },
    { region: "Краснодарский край", cities: ["Краснодар", "Сочи"] },
    { region: "Республика Беларусь", cities: ["Минск", "Гомель", "Брест"] },
    { region: "Пермский край", cities: ["Пермь", "Березники"] },
    { region: "Кировская область", cities: ["Киров"] },
    { region: "Вологодская область", cities: ["Череповец", "Вологда"] },
    { region: "Оренбургская область", cities: ["Оренбург", "Орск"] }
  ];

  const TEAMS = [
    { id: "torpedo", name: "Торпедо", group: "А", city: "Нижний Новгород", short: "ТОР" },
    { id: "lokomotiv", name: "Локомотив", group: "А", city: "Ярославль", short: "ЛОК" },
    { id: "dynamo_msk", name: "Динамо Москва", group: "А", city: "Москва", short: "ДМ" },
    { id: "mah", name: "Московская академия хоккея", group: "А", city: "Москва", short: "МАХ" },
    { id: "avangard", name: "Авангард", group: "А", city: "Омск", short: "АВГ" },

    { id: "lokomotiv04", name: "Локомотив-04", group: "Б", city: "Ярославль", short: "Л04" },
    { id: "sibir", name: "Сибирь", group: "Б", city: "Новосибирск", short: "СИБ" },
    { id: "traktor", name: "Трактор", group: "Б", city: "Челябинск", short: "ТРК" },
    { id: "lada", name: "Лада", group: "Б", city: "Тольятти", short: "ЛАД" },
    { id: "ks", name: "Крылья Советов", group: "Б", city: "Москва", short: "КС" },

    { id: "akbars", name: "Ак Барс", group: "В", city: "Казань", short: "АБ" },
    { id: "dynamo_spb", name: "Динамо СПб", group: "В", city: "Санкт-Петербург", short: "ДСП" },
    { id: "am", name: "Академия Михайлова", group: "В", city: "Тула", short: "АМ" },
    { id: "dynamo_jun", name: "Динамо-Джуниверс", group: "В", city: "Минск", short: "ДЖ" },
    { id: "spartak", name: "Спартак", group: "В", city: "Москва", short: "СПА" },

    { id: "kmj", name: "Красная Машина Юниор", group: "Г", city: "Москва", short: "КМЮ" },
    { id: "severstal", name: "Северсталь", group: "Г", city: "Череповец", short: "СЕВ" },
    { id: "cska", name: "ЦСКА", group: "Г", city: "Москва", short: "ЦСК" },
    { id: "neftekhimik", name: "Нефтехимик", group: "Г", city: "Нижнекамск", short: "НХ" },
    { id: "ska", name: "Армия СКА", group: "Г", city: "Санкт-Петербург", short: "АСК" }
  ];

  const QUALITY_NAMES = [
    "Решения",
    "Внешний вид",
    "Контроль",
    "Позиция",
    "Уверенность",
    "Техника",
    "Внимательность"
  ];

  const QUALITY_LEVELS = [
    { label: "Сильная сторона", color: "green", value: 3 },
    { label: "Средний уровень", color: "yellow", value: 2 },
    { label: "Слабая сторона", color: "red", value: 1 }
  ];

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function () {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function createReferees() {
    const random = seededRandom(20261105);
    const referees = [];

    for (let i = 0; i < 225; i++) {
      const role = i < 150 ? "linesman" : "referee";
      const region = REGIONS[Math.floor(random() * REGIONS.length)];
      const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];

      const qualities = QUALITY_NAMES.map(() => {
        const roll = random();
        if (roll < 0.48) return "green";
        if (roll < 0.83) return "yellow";
        return "red";
      });

      const age = 17 + Math.floor(random() * 7);
      const experience = Math.min(age - 14, 1 + Math.floor(random() * 7));

      referees.push({
        id: `ref-${i + 1}`,
        number: 1 + Math.floor(random() * 99),
        firstName: first,
        lastName: last,
        fullName: `${last} ${first}`,
        age,
        experience,
        region: region.region,
        city: region.cities[Math.floor(random() * region.cities.length)],
        role,
        roleLabel: role === "linesman" ? "Линейный" : "Главный",
        qualities,
        qualityNames: QUALITY_NAMES,
        rating: Number((qualities.reduce((sum, q) => sum + (
          q === "green" ? 3 : q === "yellow" ? 2 : 1
        ), 0) / 7 * 3.3).toFixed(1)),
        selected: false,
        matchHistory: [],
        finalRating: null,
        individualTrainings: []
      });
    }

    const egor = {
      id: "ref-egor-nikolaev",
      number: 99,
      firstName: "Егор",
      lastName: "Николаев",
      fullName: "Николаев Егор",
      age: 17,
      experience: 3,
      region: "Республика Татарстан",
      city: "Набережные Челны",
      role: "linesman",
      roleLabel: "Линейный",
      qualities: ["green", "green", "yellow", "green", "green", "yellow", "green"],
      qualityNames: QUALITY_NAMES,
      rating: 8.1,
      selected: false,
      matchHistory: [],
      finalRating: null,
      individualTrainings: []
    };

    referees[98] = egor;

    return referees;
  }

  const REFEREES = createReferees();

  function createInitialState() {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      tournament: {
        name: "Кубок России U16",
        city: "Сочи",
        arenas: ["ЛД Большой", "ЛДС Айсберг"],
        startDate: "2026-12-01",
        groupDays: 10,
        currentPhase: "selection"
      },
      referees: REFEREES.map(ref => ({ ...ref })),
      selectedLinesmen: [],
      selectedReferees: [],
      matches: [],
      standings: {},
      playoffs: {
        active: false,
        rounds: [],
        champion: null
      },
      reports: [],
      trainings: [],
      completed: false,
      activity: []
    };
  }

  window.REF_CONTROL_DATA = {
    teams: TEAMS,
    groups: ["А", "Б", "В", "Г"],
    qualityNames: QUALITY_NAMES,
    qualityLevels: QUALITY_LEVELS,
    referees: REFEREES,
    createInitialState,
    version: 1
  };
})();
